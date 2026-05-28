import asyncio
import json
import time
import platform
import os
import subprocess
import psutil
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Aether System HUD Backend")

# Enable CORS for local HTML testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CommandRequest(BaseModel):
    command: str

# Helper to get system uptime formatted
def get_uptime():
    boot_time = psutil.boot_time()
    uptime_seconds = time.time() - boot_time
    days = int(uptime_seconds // (24 * 3600))
    hours = int((uptime_seconds % (24 * 3600)) // 3600)
    minutes = int((uptime_seconds % 3600) // 60)
    
    parts = []
    if days > 0:
        parts.append(f"{days}d")
    if hours > 0:
        parts.append(f"{hours}h")
    parts.append(f"{minutes}m")
    return " ".join(parts)

# Helper to retrieve top processes
def get_top_processes():
    processes = []
    for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
        try:
            # We call cpu_percent once. It returns 0.0 initially, but over WebSocket loops
            # it will reflect real usage.
            info = proc.info
            info['cpu_percent'] = round(info['cpu_percent'] or 0.0, 1)
            info['memory_percent'] = round(info['memory_percent'] or 0.0, 1)
            
            # Skip system processes with no name
            if info['name']:
                processes.append(info)
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue
            
    # Sort processes by memory percent first, then CPU percent
    # (Memory is more stable on initial query, and CPU compiles over loop iterations)
    sorted_proc = sorted(processes, key=lambda x: (x['cpu_percent'], x['memory_percent']), reverse=True)
    return sorted_proc[:8]

# Gather telemetry dictionary
def get_system_stats():
    # CPU
    cpu_percent = psutil.cpu_percent(interval=None)
    cpu_cores = psutil.cpu_count(logical=True)
    
    # RAM
    ram = psutil.virtual_memory()
    ram_total_gb = round(ram.total / (1024**3), 1)
    ram_used_gb = round(ram.used / (1024**3), 1)
    ram_percent = ram.percent
    
    # Disk
    disk = psutil.disk_usage('/')
    disk_total_gb = round(disk.total / (1024**3), 1)
    disk_used_gb = round(disk.used / (1024**3), 1)
    disk_percent = disk.percent
    
    # Network I/O
    net_io = psutil.net_io_counters()
    net_sent_mb = round(net_io.bytes_sent / (1024**2), 1)
    net_recv_mb = round(net_io.bytes_recv / (1024**2), 1)
    
    return {
        "cpu_percent": cpu_percent,
        "cpu_cores": cpu_cores,
        "ram_percent": ram_percent,
        "ram_used": ram_used_gb,
        "ram_total": ram_total_gb,
        "disk_percent": disk_percent,
        "disk_used": disk_used_gb,
        "disk_total": disk_total_gb,
        "net_sent": net_sent_mb,
        "net_recv": net_recv_mb,
        "uptime": get_uptime(),
        "processes": get_top_processes()
    }

# WebSockets Endpoint to stream hardware metrics
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    # First call to cpu_percent initializes tracking
    psutil.cpu_percent(interval=None)
    try:
        while True:
            stats = get_system_stats()
            await websocket.send_text(json.dumps(stats))
            # Broadcast updates every 1000ms
            await asyncio.sleep(1.0)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket Error: {e}")

# Secure API Command Runner
@app.post("/run-command")
async def execute_command(req: CommandRequest):
    cmd = req.command.strip().lower()
    
    # Predefined safe utility routines
    if cmd == "system summary":
        cpu_freq = psutil.cpu_freq()
        freq_str = f"{round(cpu_freq.current / 1000, 2)} GHz" if cpu_freq else "Unknown"
        
        summary = (
            f"--- AETHER SYSTEM SUMMARY ---\n"
            f"OS Platform     : {platform.system()} {platform.release()} ({platform.architecture()[0]})\n"
            f"Processor       : {platform.processor()}\n"
            f"Core Count      : {psutil.cpu_count(logical=False)} Physical / {psutil.cpu_count(logical=True)} Logical\n"
            f"CPU Frequency   : {freq_str}\n"
            f"Total RAM       : {round(psutil.virtual_memory().total / (1024**3), 2)} GB\n"
            f"Python Runtime  : {platform.python_version()}\n"
            f"Uptime Duration : {get_uptime()}\n"
            f"-----------------------------"
        )
        return {"output": summary}
        
    elif cmd in ["scan network", "network scan", "ping test"]:
        # Run a simple ping test to local router or localhost
        host = "127.0.0.1"
        try:
            # Check OS to use correct ping command
            ping_cmd = ["ping", "-n", "2", host] if platform.system() == "Windows" else ["ping", "-c", "2", host]
            res = subprocess.run(ping_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=5)
            
            output = f"Scanning local loopback diagnostics...\n{res.stdout}"
            return {"output": output}
        except Exception as e:
            return {"output": f"Network Diagnostic Failed: {str(e)}"}
            
    elif cmd in ["clean temp", "disk optimization", "cleanup"]:
        temp_dir = os.environ.get('TEMP') if platform.system() == "Windows" else "/tmp"
        if not temp_dir or not os.path.exists(temp_dir):
            return {"output": "System Temp Directory not located."}
            
        try:
            files_count = 0
            total_size = 0
            for root, dirs, files in os.walk(temp_dir):
                for f in files:
                    try:
                        fp = os.path.join(root, f)
                        total_size += os.path.getsize(fp)
                        files_count += 1
                    except:
                        continue
            
            size_mb = round(total_size / (1024**2), 1)
            output = (
                f"--- STORAGE CLEANUP REPORT ---\n"
                f"Scan Path: {temp_dir}\n"
                f"Found {files_count} cache and temporary files.\n"
                f"Recoverable Storage Space: {size_mb} MB\n"
                f"Simulation completed. Safe utility operation executed successfully."
            )
            return {"output": output}
        except Exception as e:
            return {"output": f"Storage analysis failed: {str(e)}"}
            
    elif cmd in ["disk check", "storage analysis", "partitions"]:
        # Retrieve disk partitions list
        try:
            parts = psutil.disk_partitions()
            out = ["--- DRIVE PARTITION MAP ---"]
            for p in parts:
                try:
                    usage = psutil.disk_usage(p.mountpoint)
                    free = round(usage.free / (1024**3), 1)
                    total = round(usage.total / (1024**3), 1)
                    out.append(f"Drive {p.device} [{p.fstype}] -> Total: {total}GB, Free: {free}GB (Mount: {p.mountpoint})")
                except:
                    out.append(f"Drive {p.device} -> Mounted but inaccessible.")
            return {"output": "\n".join(out)}
        except Exception as e:
            return {"output": f"Partition Map Retrieval Failed: {str(e)}"}
            
    else:
        # Help Menu for unsupported queries
        help_text = (
            f"Command '{req.command}' not recognized.\n\n"
            f"Available safe routines:\n"
            f"  - 'system summary' : General hardware configuration logs.\n"
            f"  - 'scan network'   : Diagnostic local network ping sweeps.\n"
            f"  - 'clean temp'     : Scans cache space for safe deletion.\n"
            f"  - 'disk check'     : Lists storage drive mappings and free space."
        )
        return {"output": help_text}

# API endpoint to terminate processes by PID
@app.post("/terminate/{pid}")
async def kill_process(pid: int):
    try:
        proc = psutil.Process(pid)
        name = proc.name()
        proc.terminate()
        return {"message": f"Process {name} (PID: {pid}) terminated successfully."}
    except psutil.NoSuchProcess:
        raise HTTPException(status_code=404, detail="Process not found.")
    except psutil.AccessDenied:
        raise HTTPException(status_code=403, detail="Access denied to terminate this process.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

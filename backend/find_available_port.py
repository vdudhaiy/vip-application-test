#!/usr/bin/env python
"""
Port availability utility - finds an available port from a list of preferred ports.
Usage: python find_available_port.py [preferred_port] [preferred_port2] ...
Exits with the first available port or raises an error if none are available.
"""

import socket
import sys


def is_port_available(port, host="0.0.0.0"):
    """
    Check if a port is available on the given host.
    
    Args:
        port (int): Port number to check
        host (str): Host to bind to (default: 0.0.0.0)
    
    Returns:
        bool: True if port is available, False otherwise
    """
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            sock.bind((host, port))
            return True
    except (OSError, socket.error):
        return False


def find_available_port(preferred_ports):
    """
    Find the first available port from a list of preferred ports.
    
    Args:
        preferred_ports (list): List of port numbers to try in order
    
    Returns:
        int: First available port
    
    Raises:
        Exception: If no ports are available
    """
    for port in preferred_ports:
        if is_port_available(port):
            return port
    
    raise Exception(f"None of the preferred ports are available: {preferred_ports}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        # Default ports to try: 8000, 8001, 8002, 8003, 8004
        preferred_ports = [8000, 8001, 8002, 8003, 8004]
    else:
        # Parse ports from command line arguments
        preferred_ports = [int(port) for port in sys.argv[1:]]
    
    try:
        available_port = find_available_port(preferred_ports)
        print(available_port)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)

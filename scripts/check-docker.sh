#!/bin/bash

###############################################################################
# Docker Health Check and Auto-Start Script
# 
# This script automatically:
# 1. Checks if Docker is running
# 2. Starts Docker if it's not running
# 3. Starts the PaddleOCR container if needed
# 4. Provides helpful error messages
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is installed
check_docker_installed() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed!"
        echo ""
        echo "Please install Docker:"
        echo "  - Linux: https://docs.docker.com/engine/install/"
        echo "  - macOS: https://docs.docker.com/desktop/install/mac-install/"
        echo "  - Windows: https://docs.docker.com/desktop/install/windows-install/"
        exit 1
    fi
    print_success "Docker is installed"
}

# Function to check if Docker is running
check_docker_running() {
    if ! docker info &> /dev/null; then
        print_warning "Docker is not running"
        return 1
    fi
    print_success "Docker is running"
    return 0
}

# Function to start Docker (platform-specific)
start_docker() {
    print_status "Attempting to start Docker..."
    
    # Detect platform
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v systemctl &> /dev/null; then
            sudo systemctl start docker
            print_success "Docker started via systemctl"
        elif command -v service &> /dev/null; then
            sudo service docker start
            print_success "Docker started via service"
        else
            print_error "Cannot start Docker automatically. Please start Docker manually."
            exit 1
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        open -a Docker
        print_status "Waiting for Docker Desktop to start..."
        sleep 10
        print_success "Docker Desktop started"
    else
        print_error "Unsupported platform: $OSTYPE"
        print_error "Please start Docker manually"
        exit 1
    fi
}

# Function to check if PaddleOCR container is running
check_container_running() {
    if docker ps --format '{{.Names}}' | grep -q "paddleocr-server"; then
        print_success "PaddleOCR container is running"
        return 0
    else
        print_warning "PaddleOCR container is not running"
        return 1
    fi
}

# Function to start PaddleOCR container
start_container() {
    print_status "Starting PaddleOCR container..."
    
    cd "$(dirname "$0")/.." || exit 1
    
    if docker compose up -d; then
        print_success "PaddleOCR container started"
        
        # Wait for container to be healthy
        print_status "Waiting for container to be ready..."
        sleep 5
        
        # Check health endpoint
        if curl -s http://localhost:5000/health > /dev/null 2>&1; then
            print_success "PaddleOCR is ready!"
        else
            print_warning "Container started but health check failed. It may still be initializing..."
        fi
    else
        print_error "Failed to start PaddleOCR container"
        exit 1
    fi
}

# Main execution
main() {
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "  🐳 Docker Health Check & Auto-Start"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    
    # Step 1: Check if Docker is installed
    check_docker_installed
    
    # Step 2: Check if Docker is running, start if not
    if ! check_docker_running; then
        start_docker
        sleep 3
        if ! check_docker_running; then
            print_error "Failed to start Docker"
            exit 1
        fi
    fi
    
    # Step 3: Check if PaddleOCR container is running, start if not
    if ! check_container_running; then
        start_container
    fi
    
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    print_success "All systems operational! 🎉"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
}

main "$@"


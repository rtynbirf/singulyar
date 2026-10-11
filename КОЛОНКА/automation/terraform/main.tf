# Terraform Configuration for OMNISPEAKER-1 Infrastructure Deployment

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0.0"
    }
  }
}

provider "docker" {
  host = "unix:///var/run/docker.sock"
}

# Network setup for local isolated container environment
resource "docker_network" "omnispeaker_vlan20" {
  name   = "omnispeaker_vlan20_net"
  driver = "bridge"
  ipam_config {
    subnet  = "192.168.20.0/24"
    gateway = "192.168.20.1"
  }
}

# Volume for persistent Redis Audit Trail and Vector DB
resource "docker_volume" "audit_data" {
  name = "omnispeaker_audit_data"
}

# Container for OMNISPEAKER Core Service
resource "docker_container" "omnispeaker_core" {
  name  = "omnispeaker_core_node"
  image = "omnispeaker/core:latest"

  networks_advanced {
    name         = docker_network.omnispeaker_vlan20.name
    ipv4_address = "192.168.20.10"
  }

  volumes {
    volume_name    = docker_volume.audit_data.name
    container_path = "/var/log/omnispeaker/audit"
  }

  env = [
    "OFFLINE_MODE=true",
    "POLICY_ENGINE_STRICT=true",
    "LOG_LEVEL=info"
  ]

  restart = "unless-stopped"
}

output "omnispeaker_node_ip" {
  value       = docker_container.omnispeaker_core.networks_advanced[0].ipv4_address
  description = "Assigned IP address of OMNISPEAKER Node"
}

output "network_subnet" {
  value       = docker_network.omnispeaker_vlan20.ipam_config[0].subnet
  description = "VLAN 20 Subnet"
}

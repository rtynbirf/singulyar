variable "node_ip" {
  type        = string
  default     = "192.168.20.10"
  description = "Target IP address for OMNISPEAKER Node in VLAN 20"
}

variable "offline_mode" {
  type        = bool
  default     = true
  description = "Enforce zero cloud connectivity"
}

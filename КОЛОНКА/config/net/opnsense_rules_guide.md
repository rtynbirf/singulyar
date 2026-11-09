# OPNsense Setup Guide for OMNISPEAKER-1 Isolation

1. Interfaces:
   - Create VLAN 20 on parent interface (e.g. igc0).
   - Assign IP `192.168.20.1/24` to `OMNISPEAKER_VLAN`.

2. Firewall Rules (Floating Rules):
   - Action: Block
   - Interface: OMNISPEAKER_VLAN
   - Direction: out
   - Destination: WAN net
   - Description: Block-IoT-Egress

3. mDNS Repeater Plugin:
   - Install `os-mdns-repeater`
   - Select interfaces: `LAN`, `OMNISPEAKER_VLAN`

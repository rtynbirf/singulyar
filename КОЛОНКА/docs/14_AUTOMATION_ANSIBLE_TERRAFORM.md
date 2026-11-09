# 14 · АВТОМАТИЗАЦИЯ РАЗВЕРТЫВАНИЯ (TERRAFORM & ANSIBLE)

## 1. Стек Infrastructure as Code (IaC)

Дистрибутив OMNISPEAKER-1 поставляется с полным комплектом автоматизации развертывания для подсистем:

1. **Terraform (`automation/terraform/`):**
   - Провижининг виртуальных машин или контейнеров в гипервизоре (Proxmox / KVM / Docker Engine).
   - Создание сетевых интерфейсов, виртуальных коммутаторов и привязка VLAN 10-50.
   - Вывод IP-адресов и параметров подключения в `outputs.tf`.

2. **Ansible (`automation/ansible/`):**
   - `playbook_openwrt.yml` — Автоматическая загрузка конфигураций сетевых интерфейсов, `nftables` и Avahi на роутер OpenWrt.
   - `playbook_opnsense.yml` — Настройка плагина mDNS-repeater и правил фаервола на OPNsense.
   - `playbook_omnispeaker_node.yml` — Подготовка целевого одноплатника RK3588 (установка Docker, драйверов NPU RKNN, конфигурирование PipeWire и запуск Docker Compose стека).

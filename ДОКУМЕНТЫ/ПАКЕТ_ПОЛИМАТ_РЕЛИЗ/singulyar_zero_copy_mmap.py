import mmap, os
class SingulyarZeroCopyState:
    def __init__(self, filename="singulyar_state.bin", node_count=64):
        self.size = node_count * 32
        self.f = open(filename, "w+b")
        self.f.write(b'\x00' * self.size)
        self.f.flush()
        self.mm = mmap.mmap(self.f.fileno(), self.size)

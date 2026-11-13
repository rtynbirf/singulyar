import numpy as np

def simulate_ultrasonic_air_mesh():
    fs = 48000
    fc = 19000
    duration = 0.05
    t = np.linspace(0, duration, int(fs * duration), endpoint=False)
    
    phases_to_transmit = [0.0, np.pi/2, np.pi, 3*np.pi/2, np.pi/4, 0.0, np.pi, np.pi/2, 3*np.pi/4, 0.0]
    results = []
    
    for idx, tx_phase in enumerate(phases_to_transmit):
        signal = np.cos(2 * np.pi * fc * t + tx_phase)
        noise = 0.1 * np.random.randn(len(t))
        rx_signal = signal + noise
        
        i_comp = rx_signal * Math_cos_vec(2 * np.pi * fc * t)
        q_comp = rx_signal * Math_sin_vec(2 * np.pi * fc * t)
        
        rx_phase = np.arctan2(np.sum(q_comp), np.sum(i_comp))
        if rx_phase < 0:
            rx_phase += 2 * np.pi
            
        diff = abs(tx_phase - rx_phase)
        diff = min(diff, 2*np.pi - diff)
        results.append((tx_phase, rx_phase, diff))
        
    return results

def Math_cos_vec(arr): return np.cos(arr)
def Math_sin_vec(arr): return np.sin(arr)

if __name__ == "__main__":
    res = simulate_ultrasonic_air_mesh()
    print("=== АКУСТИЧЕСКИЙ ТЕСТ: УЛЬТРАЗВУКОВАЯ ДЕМОДУЛЯЦИЯ МЕЖДУ PWA-УЗЛАМИ ===")
    for i, (tx, rx, err) in enumerate(res):
        print(f"Символ #{i+1:02d} | TX: {tx:.3f} rad | RX: {rx:.3f} rad | Ошибка: {err:.6f} rad")

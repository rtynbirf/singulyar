// OMNISPEAKER-1 Parametric Shell (OpenSCAD v2026.1)
// Sealed 0.8L acoustic volume, 360 acoustic reflector cone, 8-mic ring, mmWave slot

$fn = 90;

// Dimensions in mm
body_h = 210;
body_d = 120;
wall_th = 4;
chamber_h = 135; // 0.8 liter sealed acoustic volume
reflector_h = 35;
mic_ring_d = 100;

module main_body() {
    difference() {
        // Outer cylinder with rounded bottom
        hull() {
            translate([0, 0, 10])
                cylinder(h = body_h - 10, d = body_d);
            translate([0, 0, 5])
                scale([1, 1, 0.5]) sphere(d = body_d);
        }
        
        // Inner acoustic chamber (0.8 Liter)
        translate([0, 0, wall_th])
            cylinder(h = chamber_h, d = body_d - (2 * wall_th));
            
        // Upper reflector cutout
        translate([0, 0, chamber_h + wall_th])
            cylinder(h = body_h - chamber_h - wall_th, d = body_d - (2 * wall_th));
            
        // Passive Radiator Cutout (85mm side mount)
        translate([0, body_d / 2 - wall_th - 1, chamber_h / 2])
            rotate([90, 0, 0])
                cylinder(h = wall_th + 5, d = 85);
                
        // Cable Entry and Thermal Vents (Bottom chimney effect)
        for (a = [0 : 45 : 315]) {
            rotate([0, 0, a])
                translate([body_d / 3, 0, -1])
                    cylinder(h = wall_th + 5, d = 8);
        }
    }
}

module acoustic_reflector_cone() {
    translate([0, 0, chamber_h + wall_th]) {
        difference() {
            // 45 degree dispersion cone
            cylinder(h = reflector_h, d1 = 15, d2 = body_d - (2 * wall_th));
            
            // Mounting screws
            for (a = [0 : 120 : 240]) {
                rotate([0, 0, a])
                    translate([30, 0, -1])
                        cylinder(h = reflector_h + 2, d = 3.2);
            }
        }
    }
}

module mic_array_ring() {
    translate([0, 0, body_h - 15]) {
        difference() {
            cylinder(h = 10, d = mic_ring_d + 10);
            cylinder(h = 12, d = mic_ring_d - 10);
            
            // 8 microphone holes (XMOS XU316 array)
            for (i = [0 : 7]) {
                rotate([0, 0, i * 45])
                    translate([mic_ring_d / 2, 0, -1])
                        cylinder(h = 15, d = 4.5); // O-ring silicone grommet
            }
        }
    }
}

// Render Complete Assembly
union() {
    color([0.2, 0.2, 0.25, 1.0]) main_body();
    color([0.8, 0.8, 0.8, 1.0]) acoustic_reflector_cone();
    color([0.1, 0.6, 0.4, 1.0]) mic_array_ring();
}

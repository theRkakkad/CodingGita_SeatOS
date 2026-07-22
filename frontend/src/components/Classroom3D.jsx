import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';

// Detailed 3D Ergonomic Office Chair
const ErgonomicChair3D = ({ color, hovered }) => {
  return (
    <group>
      {/* 5-Star Base & Wheels */}
      <group position={[0, 0.05, 0]}>
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.16]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
        </mesh>
        {/* Legs */}
        {[0, 72, 144, 216, 288].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          return (
            <mesh
              key={angle}
              position={[Math.sin(rad) * 0.18, 0.04, Math.cos(rad) * 0.18]}
              rotation={[0, rad, Math.PI / 12]}
            >
              <boxGeometry args={[0.26, 0.02, 0.04]} />
              <meshStandardMaterial color="#111111" roughness={0.4} />
            </mesh>
          );
        })}
      </group>

      {/* Hydraulic Cylinder */}
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.025, 0.028, 0.22]} />
        <meshStandardMaterial color="#333333" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Seat Cushion */}
      <mesh position={[0, 0.38, 0]}>
        <boxGeometry args={[0.46, 0.05, 0.46]} />
        <meshStandardMaterial
          color={color}
          roughness={0.6}
          emissive={hovered ? color : '#000000'}
          emissiveIntensity={hovered ? 0.25 : 0}
        />
      </mesh>

      {/* Armrests */}
      {[-0.24, 0.24].map((side) => (
        <group key={side} position={[side, 0.45, 0]}>
          <mesh position={[0, 0.04, 0]}>
            <boxGeometry args={[0.03, 0.12, 0.24]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <boxGeometry args={[0.04, 0.02, 0.26]} />
            <meshStandardMaterial color="#0f0f0f" roughness={0.7} />
          </mesh>
        </group>
      ))}

      {/* Backrest frame & mesh */}
      <group position={[0, 0.65, 0.2]}>
        <mesh position={[0, -0.15, 0.02]} rotation={[Math.PI / 18, 0, 0]}>
          <boxGeometry args={[0.06, 0.24, 0.03]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
        </mesh>
        <mesh rotation={[-Math.PI / 24, 0, 0]}>
          <boxGeometry args={[0.42, 0.36, 0.04]} />
          <meshStandardMaterial
            color={color}
            roughness={0.8}
            emissive={hovered ? color : '#000000'}
            emissiveIntensity={hovered ? 0.2 : 0}
          />
        </mesh>
        <mesh position={[0, 0.26, -0.01]} rotation={[-Math.PI / 12, 0, 0]}>
          <boxGeometry args={[0.26, 0.12, 0.04]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
};

// Computer Monitor + Stand
const ComputerMonitor3D = ({ faceDirection }) => {
  const rotationY = faceDirection === 1 ? Math.PI / 2 : -Math.PI / 2;

  return (
    <group rotation={[0, rotationY, 0]}>
      {/* Base */}
      <mesh position={[0, 0.01, 0]}>
        <boxGeometry args={[0.16, 0.01, 0.16]} />
        <meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Stand post */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.18]} />
        <meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Screen Frame */}
      <mesh position={[0, 0.24, 0.01]}>
        <boxGeometry args={[0.52, 0.32, 0.02]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} />
      </mesh>
      {/* Glow IDE Screen Face */}
      <mesh position={[0, 0.24, 0.021]}>
        <planeGeometry args={[0.5, 0.3]} />
        <meshStandardMaterial
          color="#0f172a"
          emissive="#3b82f6"
          emissiveIntensity={0.25}
          roughness={0.1}
        />
      </mesh>
    </group>
  );
};

// Classroom Seat Component
const ClassroomSeat3D = ({ seat, isSelected, isMySeat, onSeatClick, centerCol }) => {
  const [hovered, setHovered] = useState(false);

  const rowOffsetMap = { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5 };
  const rowIndex = rowOffsetMap[seat.row] ?? 0;
  const colIndex = Number(seat.seatIndex) || 1;

  const blockXMap = {
    5: -3.7, // F (faces Left)
    4: -2.1, // E (faces Right)
    3: -1.1, // D (faces Left)
    2: 1.1,  // C (faces Right)
    1: 2.1,  // B (faces Left)
    0: 3.7,  // A (faces Right)
  };
  const x = blockXMap[rowIndex] ?? 0;
  const z = (colIndex - centerCol) * 1.5;

  const facingDirectionMap = {
    5: -1, // F faces left (wall)
    4: 1,  // E faces right
    3: -1, // D faces left
    2: 1,  // C faces right
    1: -1, // B faces left
    0: 1,  // A faces right (wall)
  };
  const facingDirection = facingDirectionMap[rowIndex] ?? 1;

  let chairColor = '#10b981';
  if (isMySeat) {
    chairColor = '#fbbf24';
  } else if (isSelected) {
    chairColor = '#f5a623';
  } else if (seat.isBooked) {
    chairColor = '#ef4444';
  }

  const handlePointerOver = (e) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = (e) => {
    e.stopPropagation();
    setHovered(false);
    document.body.style.cursor = 'default';
  };

  const handleClick = (e) => {
    e.stopPropagation();
    onSeatClick(seat);
  };

  const chairRotationY = facingDirection === -1 ? Math.PI / 2 : -Math.PI / 2;

  return (
    <group position={[x, 0, z]}>
      {/* ── COMPUTER MONITOR ── */}
      <group position={[facingDirection * 0.45, 0.72, 0]}>
        <ComputerMonitor3D faceDirection={facingDirection * -1} />
      </group>

      {/* ── ERGONOMIC OFFICE CHAIR ── */}
      <group
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        rotation={[0, chairRotationY, 0]}
        scale={hovered ? [1.06, 1.06, 1.06] : [1, 1, 1]}
        position={[0, 0.02, 0]}
      >
        <ErgonomicChair3D color={chairColor} hovered={hovered} />

        {/* Floating seat number label */}
        <Html distanceFactor={6} position={[0, 1.15, 0]} center>
          <div
            className="px-1.5 py-0.5 rounded text-[10px] font-black pointer-events-none select-none border"
            style={{
              background: isMySeat ? '#fbbf24' : seat.isBooked ? '#ef4444' : '#10b981',
              color: isMySeat ? '#1a0900' : '#ffffff',
              borderColor: isMySeat ? '#d97706' : 'rgba(255,255,255,0.2)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}
          >
            {seat.seatNumber}
          </div>
        </Html>

        {/* Real-time Hover Tooltip Details for Booking */}
        {hovered && (
          <Html distanceFactor={5} position={[0, 1.6, 0]} center>
            <div
              className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold border whitespace-nowrap pointer-events-none select-none backdrop-blur-md"
              style={{
                background: 'rgba(9, 6, 21, 0.92)',
                color: isMySeat ? '#fbbf24' : seat.isBooked ? '#fca5a5' : '#a7f3d0',
                borderColor: isMySeat ? '#fbbf24' : seat.isBooked ? '#ef4444' : '#10b981',
                boxShadow: '0 4px 15px rgba(0,0,0,0.6)',
              }}
            >
              <div className="flex items-center gap-2 justify-between">
                <span>Seat {seat.seatNumber}</span>
                <span
                  className="px-1.5 py-0.2 rounded text-[7px] uppercase font-black"
                  style={{
                    background: isMySeat ? '#fbbf24' : seat.isBooked ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
                    color: isMySeat ? '#1a0900' : seat.isBooked ? '#ef4444' : '#10b981',
                  }}
                >
                  {isMySeat ? 'Reserved' : seat.isBooked ? 'Booked' : 'Free'}
                </span>
              </div>
              {seat.isBooked && (
                <div className="text-[8px] opacity-75 mt-1 font-medium">
                  {seat.bookedBy ? `By: ${seat.bookedBy.name || seat.bookedBy.email}` : 'Occupied'}
                </div>
              )}
              {!seat.isBooked && !isMySeat && (
                <div className="text-[8px] opacity-60 mt-1 font-semibold">
                  Click to Reserve
                </div>
              )}
              {isMySeat && (
                <div className="text-[8px] opacity-75 mt-1 font-semibold text-amber-300">
                  This is your seat!
                </div>
              )}
            </div>
          </Html>
        )}
      </group>
    </group>
  );
};

// Continuous Desks matching real classroom arrangement
const ClassroomFurniture3D = ({ seats, centerCol }) => {
  const getMaxSeatIndexForRows = (rowsList) => {
    const matchedSeats = seats.filter((s) => rowsList.includes(s.row));
    if (matchedSeats.length === 0) return 0;
    return Math.max(...matchedSeats.map((s) => Number(s.seatIndex) || 1), 0);
  };

  const maxFIndex = getMaxSeatIndexForRows(['F']);
  const maxEDIndex = getMaxSeatIndexForRows(['E', 'D']);
  const maxCBIndex = getMaxSeatIndexForRows(['C', 'B']);
  const maxAIndex = getMaxSeatIndexForRows(['A']);

  const getDeskPlacement = (maxZIndex) => {
    if (maxZIndex === 0) return { length: 0, zCenter: 0, legs: [] };
    const length = (maxZIndex - 0.5) * 1.5 + 0.8;
    const zCenter = (((1 - centerCol) * 1.5) + ((maxZIndex - centerCol) * 1.5)) / 2;

    const legs = [];
    const start = (1 - centerCol) * 1.5 + 0.2;
    const end = (maxZIndex - centerCol) * 1.5 - 0.2;
    const span = end - start;
    const numSegments = Math.max(Math.ceil(span / 3.3), 1);
    for (let i = 0; i <= numSegments; i++) {
      legs.push(start + (span * i) / numSegments);
    }

    return { length, zCenter, legs };
  };

  const desk4 = getDeskPlacement(maxFIndex);
  const desk3 = getDeskPlacement(maxEDIndex);
  const desk2 = getDeskPlacement(maxCBIndex);
  const desk1 = getDeskPlacement(maxAIndex);

  return (
    <group>
      {/* ── DESK 4 (Leftmost, Row F) ── */}
      {desk4.length > 0 && (
        <group position={[-4.15, 0, desk4.zCenter]}>
          <mesh position={[0, 0.72, 0]} receiveShadow castShadow>
            <boxGeometry args={[0.7, 0.04, desk4.length]} />
            <meshStandardMaterial color="#ddb892" roughness={0.4} metalness={0.1} />
          </mesh>
          {desk4.legs.map((pz, idx) => (
            <mesh key={idx} position={[0, 0.35, pz - desk4.zCenter]}>
              <cylinderGeometry args={[0.025, 0.025, 0.7]} />
              <meshStandardMaterial color="#2d3748" metalness={0.7} roughness={0.3} />
            </mesh>
          ))}
        </group>
      )}

      {/* ── DESK 3 (Middle-Left, Row E & D) ── */}
      {desk3.length > 0 && (
        <group position={[-1.6, 0, desk3.zCenter]}>
          <mesh position={[0, 0.72, 0]} receiveShadow castShadow>
            <boxGeometry args={[1.4, 0.04, desk3.length]} />
            <meshStandardMaterial color="#ddb892" roughness={0.4} metalness={0.1} />
          </mesh>
          {/* Center blue divider board */}
          <mesh position={[0, 0.94, 0]} castShadow>
            <boxGeometry args={[0.02, 0.44, desk3.length]} />
            <meshStandardMaterial color="#3182ce" roughness={0.5} />
          </mesh>
          <mesh position={[0, 1.16, 0]}>
            <boxGeometry args={[0.025, 0.015, desk3.length]} />
            <meshStandardMaterial color="#a0aec0" metalness={0.8} roughness={0.2} />
          </mesh>
          {desk3.legs.map((pz, idx) => (
            <group key={idx} position={[0, 0.35, pz - desk3.zCenter]}>
              <mesh position={[-0.62, 0, 0]}>
                <cylinderGeometry args={[0.025, 0.025, 0.7]} />
                <meshStandardMaterial color="#2d3748" metalness={0.7} roughness={0.3} />
              </mesh>
              <mesh position={[0.62, 0, 0]}>
                <cylinderGeometry args={[0.025, 0.025, 0.7]} />
                <meshStandardMaterial color="#2d3748" metalness={0.7} roughness={0.3} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* ── DESK 2 (Middle-Right, Row C & B) ── */}
      {desk2.length > 0 && (
        <group position={[1.6, 0, desk2.zCenter]}>
          <mesh position={[0, 0.72, 0]} receiveShadow castShadow>
            <boxGeometry args={[1.4, 0.04, desk2.length]} />
            <meshStandardMaterial color="#ddb892" roughness={0.4} metalness={0.1} />
          </mesh>
          {/* Center blue divider board */}
          <mesh position={[0, 0.94, 0]} castShadow>
            <boxGeometry args={[0.02, 0.44, desk2.length]} />
            <meshStandardMaterial color="#3182ce" roughness={0.5} />
          </mesh>
          <mesh position={[0, 1.16, 0]}>
            <boxGeometry args={[0.025, 0.015, desk2.length]} />
            <meshStandardMaterial color="#a0aec0" metalness={0.8} roughness={0.2} />
          </mesh>
          {desk2.legs.map((pz, idx) => (
            <group key={idx} position={[0, 0.35, pz - desk2.zCenter]}>
              <mesh position={[-0.62, 0, 0]}>
                <cylinderGeometry args={[0.025, 0.025, 0.7]} />
                <meshStandardMaterial color="#2d3748" metalness={0.7} roughness={0.3} />
              </mesh>
              <mesh position={[0.62, 0, 0]}>
                <cylinderGeometry args={[0.025, 0.025, 0.7]} />
                <meshStandardMaterial color="#2d3748" metalness={0.7} roughness={0.3} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* ── DESK 1 (Rightmost, Row A) ── */}
      {desk1.length > 0 && (
        <group position={[4.15, 0, desk1.zCenter]}>
          <mesh position={[0, 0.72, 0]} receiveShadow castShadow>
            <boxGeometry args={[0.7, 0.04, desk1.length]} />
            <meshStandardMaterial color="#ddb892" roughness={0.4} metalness={0.1} />
          </mesh>
          {desk1.legs.map((pz, idx) => (
            <mesh key={idx} position={[0, 0.35, pz - desk1.zCenter]}>
              <cylinderGeometry args={[0.025, 0.025, 0.7]} />
              <meshStandardMaterial color="#2d3748" metalness={0.7} roughness={0.3} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
};

// 3D Walls, ACs and exposed conduits
const RoomWalls3D = ({ frontWallZ, wallCenterZ, wallLength }) => {
  return (
    <group>
      {/* Front wall behind teacher stage */}
      <mesh position={[0, 2.0, frontWallZ]} receiveShadow>
        <boxGeometry args={[9.5, 4.0, 0.15]} />
        <meshStandardMaterial color="#a0aec0" roughness={0.5} />
      </mesh>

      {/* Left Wall */}
      <mesh position={[-4.5, 2.0, wallCenterZ]} receiveShadow>
        <boxGeometry args={[0.1, 4.0, wallLength]} />
        <meshStandardMaterial color="#8a95a5" roughness={0.6} />
      </mesh>

      {/* Right Wall */}
      <mesh position={[4.5, 2.0, wallCenterZ]} receiveShadow>
        <boxGeometry args={[0.1, 4.0, wallLength]} />
        <meshStandardMaterial color="#8a95a5" roughness={0.6} />
      </mesh>

      {/* Exposed Electrical Conduits */}
      {[-2.5, 0, 2.5].map((px) => (
        <mesh key={px} position={[px, 3.9, wallCenterZ]}>
          <cylinderGeometry args={[0.015, 0.015, wallLength - 0.5]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.4} />
        </mesh>
      ))}
      {[frontWallZ + 3.0, wallCenterZ, frontWallZ + wallLength - 3.0].map((pz) => (
        <mesh key={pz} position={[0, 3.9, pz]} rotation={[0, Math.PI / 2, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 8.8]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.4} />
        </mesh>
      ))}

      {/* Wall Split Air Conditioners */}
      {[-4.4, 4.4].map((xPos) => (
        <group key={xPos} position={[xPos, 2.8, frontWallZ + 6.0]} rotation={[0, xPos < 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
          <mesh castShadow>
            <boxGeometry args={[1.2, 0.35, 0.28]} />
            <meshStandardMaterial color="#ffffff" roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.15, 0.04]} rotation={[Math.PI / 8, 0, 0]}>
            <boxGeometry args={[1.1, 0.02, 0.1]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
          </mesh>
        </group>
      ))}

      {/* Door frame */}
      <group position={[-3.5, 1.0, frontWallZ + 0.1]}>
        <mesh castShadow>
          <boxGeometry args={[0.9, 2.0, 0.08]} />
          <meshStandardMaterial color="#2d3748" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.01]} castShadow>
          <boxGeometry args={[0.86, 1.96, 0.03]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        <mesh position={[-0.35, 0, 0.03]}>
          <cylinderGeometry args={[0.01, 0.01, 0.1]} />
          <meshStandardMaterial color="#cbd5e0" metalness={0.9} />
        </mesh>
      </group>
    </group>
  );
};

// Rotating Ceiling Fan Component
const CeilingFan3D = ({ position }) => {
  const fanRef = useRef();

  useFrame((state, delta) => {
    if (fanRef.current) {
      fanRef.current.rotation.y += delta * 5.0;
    }
  });

  return (
    <group position={position}>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.8]} />
        <meshStandardMaterial color="#2d3748" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.0, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.1]} />
        <meshStandardMaterial color="#2d3748" metalness={0.7} roughness={0.3} />
      </mesh>
      <group ref={fanRef}>
        {[0, 120, 240].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          return (
            <mesh
              key={angle}
              position={[Math.sin(rad) * 0.35, 0, Math.cos(rad) * 0.35]}
              rotation={[0, rad, 0]}
            >
              <boxGeometry args={[0.06, 0.005, 0.6]} />
              <meshStandardMaterial color="#a0aec0" roughness={0.5} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
};

// Fluorescent Lights
const HangingLights3D = ({ maxIndex, centerCol }) => {
  const lightPositions = [
    { x: -3.85 },
    { x: -1.6 },
    { x: 1.6 },
    { x: 4.15 },
  ];

  const startZ = (1 - centerCol) * 1.5 + 0.5;
  const endZ = (maxIndex - centerCol) * 1.5 - 0.5;
  const step = (endZ - startZ) / 2;

  const lightZs = [startZ, startZ + step, endZ];

  return (
    <group>
      {lightPositions.map((col, cIdx) =>
        lightZs.map((z, zIdx) => (
          <group key={`${cIdx}-${zIdx}`} position={[col.x, 3.6, z]}>
            <mesh position={[-0.6, 0.2, 0]}>
              <cylinderGeometry args={[0.004, 0.004, 0.4]} />
              <meshStandardMaterial color="#000" />
            </mesh>
            <mesh position={[0.6, 0.2, 0]}>
              <cylinderGeometry args={[0.004, 0.004, 0.4]} />
              <meshStandardMaterial color="#000" />
            </mesh>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[1.5, 0.04, 0.06]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh position={[0, -0.021, 0]}>
              <boxGeometry args={[1.48, 0.005, 0.05]} />
              <meshStandardMaterial
                color="#ffffff"
                emissive="#fffaed"
                emissiveIntensity={2.5}
                roughness={0.1}
              />
            </mesh>
          </group>
        ))
      )}
    </group>
  );
};

// Teacher Stage
const TeacherStage3D = ({ frontWallZ }) => {
  return (
    <group position={[0, 0, frontWallZ + 0.2]}>
      <group position={[0, 0, 1]}>
        <mesh position={[0, 0.75, 0]}>
          <boxGeometry args={[2.0, 0.06, 0.8]} />
          <meshStandardMaterial color="#312217" roughness={0.3} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.38, -0.3]}>
          <boxGeometry args={[1.8, 0.7, 0.04]} />
          <meshStandardMaterial color="#312217" roughness={0.3} />
        </mesh>
        <mesh position={[-0.9, 0.38, 0]}>
          <boxGeometry args={[0.05, 0.7, 0.7]} />
          <meshStandardMaterial color="#312217" roughness={0.3} />
        </mesh>
        <mesh position={[0.9, 0.38, 0]}>
          <boxGeometry args={[0.05, 0.7, 0.7]} />
          <meshStandardMaterial color="#312217" roughness={0.3} />
        </mesh>
      </group>

      <group position={[0, 2.2, 0]}>
        <mesh>
          <boxGeometry args={[5.2, 2.2, 0.1]} />
          <meshStandardMaterial color="#2d1a0e" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.06]}>
          <boxGeometry args={[5.0, 2.0, 0.02]} />
          <meshStandardMaterial color="#1a0d35" roughness={0.7} />
        </mesh>
        <Html transform position={[0, 0.4, 0.08]} distanceFactor={4}>
          <div className="text-center select-none pointer-events-none w-[400px]">
            <h1 className="text-base font-black tracking-widest text-[#f9ca3a] uppercase" style={{ fontFamily: 'Poppins, sans-serif' }}>
              ✦ CodingGita ✦
            </h1>
            <p className="text-[9px] uppercase font-bold tracking-widest text-slate-400 mt-1">
              Classroom Lecture Hall Board
            </p>
          </div>
        </Html>
      </group>
    </group>
  );
};

// Dynamic camera view controller component inside canvas context
const CameraController = ({ preset, wallCenterZ, controlsRef }) => {
  const { camera } = useThree();

  useEffect(() => {
    if (!controlsRef.current) return;

    if (preset === 'front') {
      // Look from board down towards students
      camera.position.set(0, 3.4, -6.0);
      controlsRef.current.target.set(0, 0.5, wallCenterZ);
    } else if (preset === 'top') {
      // Top down view centered on layout
      camera.position.set(0, 13, wallCenterZ);
      controlsRef.current.target.set(0, 0, wallCenterZ);
    } else {
      // Reset view centered around classroom rows
      camera.position.set(0, 8, wallCenterZ + 9);
      controlsRef.current.target.set(0, 0, wallCenterZ);
    }
    controlsRef.current.update();
  }, [preset, wallCenterZ, camera, controlsRef]);

  return null;
};

// Classroom 3D Scene Root
const Classroom3D = ({
  seats = [],
  selectedSeat = null,
  myBookedSeatId = null,
  highlightedSeatId = null,
  onSeatClick,
  isLoading = false,
}) => {
  const [camPreset, setCamPreset] = useState('reset');
  const controlsRef = useRef();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 cg-card min-h-[400px]">
        <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#f9ca3a', borderTopColor: 'transparent' }} />
        <p className="text-sm font-semibold mt-4" style={{ color: 'rgba(255,255,255,0.5)' }}>Loading 3D classroom scene...</p>
      </div>
    );
  }

  const maxIndex = Math.max(...seats.map((s) => Number(s.seatIndex) || 1), 9);
  const centerCol = (maxIndex + 1) / 2;

  const frontWallZ = -(centerCol - 1) * 1.5 - 2.65;
  const backSeatZ = (maxIndex - centerCol) * 1.5;
  const wallLength = (backSeatZ + 1.0) - frontWallZ;
  const wallCenterZ = (frontWallZ + backSeatZ + 1.0) / 2;

  const spotlightZ = frontWallZ + 1.9;

  return (
    <div className="cg-card p-4 flex flex-col items-center w-full relative">
      <div className="w-full h-[450px] md:h-[550px] rounded-2xl overflow-hidden relative" style={{ background: '#090615' }}>

        {/* Camera Preset Toolbar */}
        <div className="absolute top-4 left-4 flex gap-2 z-10">
          {[
            { id: 'reset', label: 'Perspective' },
            { id: 'front', label: 'Teacher Board View' },
            { id: 'top', label: 'Bird\'s Eye View' },
          ].map((view) => (
            <button
              key={view.id}
              onClick={() => setCamPreset(view.id)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all backdrop-blur-md border ${camPreset === view.id
                ? 'bg-amber-400 text-neutral-900 border-amber-500 font-extrabold shadow-lg shadow-amber-500/20'
                : 'bg-neutral-950/70 text-slate-300 border-neutral-800 hover:text-white hover:bg-neutral-900/80'
                }`}
            >
              {view.label}
            </button>
          ))}
        </div>

        <Canvas
          camera={{ position: [0, 8, wallCenterZ + 9], fov: 60 }}
          shadows
        >
          <ambientLight intensity={0.45} />
          <directionalLight
            position={[8, 15, 8]}
            intensity={0.8}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <pointLight position={[-6, 6, -6]} intensity={0.3} />
          <pointLight position={[0, 3.2, spotlightZ]} intensity={0.7} distance={15} decay={1.5} />

          <TeacherStage3D frontWallZ={frontWallZ} />
          <RoomWalls3D frontWallZ={frontWallZ} wallCenterZ={wallCenterZ} wallLength={wallLength} />

          <CeilingFan3D position={[0, 3.8, frontWallZ + wallLength * 0.25]} />
          <CeilingFan3D position={[0, 3.8, frontWallZ + wallLength * 0.5]} />
          <CeilingFan3D position={[0, 3.8, frontWallZ + wallLength * 0.75]} />

          <HangingLights3D maxIndex={maxIndex} centerCol={centerCol} />
          <ClassroomFurniture3D seats={seats} centerCol={centerCol} />

          {seats.map((seat) => (
            <ClassroomSeat3D
              key={seat._id}
              seat={seat}
              isSelected={selectedSeat && seat._id === selectedSeat._id}
              isMySeat={myBookedSeatId && seat._id === myBookedSeatId}
              onSeatClick={onSeatClick}
              centerCol={centerCol}
            />
          ))}

          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, wallCenterZ]} receiveShadow>
            <planeGeometry args={[9.0, wallLength]} />
            <meshStandardMaterial color="#eaeaea" roughness={0.7} />
          </mesh>

          {/* Camera View State Controller */}
          <CameraController preset={camPreset} wallCenterZ={wallCenterZ} controlsRef={controlsRef} />

          {/* Orbit controls with precise layout centering */}
          <OrbitControls
            ref={controlsRef}
            target={[0, 0, wallCenterZ]}
            enableDamping
            dampingFactor={0.05}
            minDistance={3}
            maxDistance={25}
            maxPolarAngle={Math.PI / 2 - 0.05}
            enablePan={true}
            panSpeed={1.0}
          />
        </Canvas>

        {/* Floating Legend Overlay */}
        <div
          className="absolute top-4 right-4 px-3.5 py-3 rounded-2xl border flex flex-col gap-1.5 pointer-events-none select-none backdrop-blur-md"
          style={{
            background: 'rgba(9, 6, 21, 0.85)',
            borderColor: 'rgba(255,255,255,0.08)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          <div className="text-[8px] uppercase font-black tracking-widest text-slate-400">Legend</div>
          <div className="flex flex-col gap-1.5 text-[9px] font-bold text-white">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ background: '#10b981', border: '1px solid rgba(255,255,255,0.1)' }} />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ background: '#ef4444', border: '1px solid rgba(255,255,255,0.1)' }} />
              <span>Booked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ background: '#fbbf24', border: '1px solid rgba(255,255,255,0.1)' }} />
              <span>Your Seat</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ background: '#f5a623', border: '1px solid rgba(255,255,255,0.1)' }} />
              <span>Selected</span>
            </div>
          </div>
        </div>

        {/* Interactive help tooltip */}
        <div
          className="absolute bottom-4 left-4 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase border pointer-events-none select-none"
          style={{
            background: 'rgba(9, 6, 21, 0.8)',
            color: 'rgba(255,255,255,0.6)',
            borderColor: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(4px)',
          }}
        >
          🖱️ Left Click + Drag to rotate | 🖱️ Right Click + Drag to pan | 📜 Scroll to zoom
        </div>
      </div>
    </div>
  );
};

export default Classroom3D;

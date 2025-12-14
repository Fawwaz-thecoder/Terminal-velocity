import React from 'react';
import { CarModelType } from '../types';

interface CarVisualsProps {
  type: CarModelType;
  color: string;
  name?: string;
  wheelRotation?: number;
  speed?: number;
  isNight?: boolean;
}

const Wheel = ({ position, rotationY = 0, scale = 1 }: { position: [number, number, number], rotationY?: number, scale?: number }) => (
  <group position={position} scale={scale}>
    <mesh rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.35, 0.35, 0.4, 16]} />
      <meshStandardMaterial color="#111" roughness={0.8} />
    </mesh>
    <mesh rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.2, 0.2, 0.41, 6]} />
      <meshStandardMaterial color="#555" metalness={0.8} />
    </mesh>
  </group>
);

export const CarVisuals: React.FC<CarVisualsProps> = ({ type, color, name, wheelRotation = 0, isNight = false }) => {
  
  // --- BASIC CAR (First 6) ---
  if (type === CarModelType.BASIC) {
    return (
      <group>
        {/* Chassis */}
        <mesh position={[0, 0.6, 0]} castShadow>
          <boxGeometry args={[1.9, 0.8, 4.2]} />
          <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} />
        </mesh>
        {/* Cabin */}
        <mesh position={[0, 1.2, -0.3]}>
          <boxGeometry args={[1.6, 0.7, 2.2]} />
          <meshStandardMaterial color="#222" roughness={0.2} />
        </mesh>
        
        <Wheel position={[-0.9, 0.35, 1.3]} rotationY={wheelRotation} />
        <Wheel position={[0.9, 0.35, 1.3]} rotationY={wheelRotation} />
        <Wheel position={[-0.9, 0.35, -1.3]} />
        <Wheel position={[0.9, 0.35, -1.3]} />
      </group>
    );
  }

  // --- SPORTS CAR (Next 6) ---
  if (type === CarModelType.SPORTS) {
    return (
      <group>
        {/* Main Body */}
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[1.9, 0.7, 4.4]} />
          <meshStandardMaterial color={color} metalness={0.7} roughness={0.2} />
        </mesh>
        {/* Sleek Cabin */}
        <mesh position={[0, 1.0, -0.2]}>
          <boxGeometry args={[1.5, 0.5, 2.0]} />
          <meshStandardMaterial color="#111" roughness={0.1} />
        </mesh>
        {/* Spoiler */}
        <mesh position={[0, 0.9, 1.8]}>
          <boxGeometry args={[1.8, 0.1, 0.5]} />
          <meshStandardMaterial color={color} />
        </mesh>

        <Wheel position={[-0.95, 0.35, 1.4]} rotationY={wheelRotation} />
        <Wheel position={[0.95, 0.35, 1.4]} rotationY={wheelRotation} />
        <Wheel position={[-0.95, 0.35, -1.4]} />
        <Wheel position={[0.95, 0.35, -1.4]} />
      </group>
    );
  }

  // --- SUPER CAR (Next 6) ---
  if (type === CarModelType.SUPER) {
    return (
      <group>
        {/* Wedge Body */}
        <mesh position={[0, 0.45, 0.2]} castShadow>
           <boxGeometry args={[2.0, 0.6, 4.5]} />
           <meshStandardMaterial color={color} metalness={0.8} roughness={0.1} />
        </mesh>
        {/* Front Nose Slope */}
        <mesh position={[0, 0.3, -2.2]} rotation={[0.2, 0, 0]}>
           <boxGeometry args={[1.9, 0.3, 1.0]} />
           <meshStandardMaterial color={color} metalness={0.8} roughness={0.1} />
        </mesh>
        {/* Bubble Cabin */}
        <mesh position={[0, 0.9, -0.1]}>
          <sphereGeometry args={[0.9, 32, 16]} />
          <meshStandardMaterial color="#111" roughness={0} metalness={0.9} />
        </mesh>
        
        <Wheel position={[-1.0, 0.35, 1.5]} rotationY={wheelRotation} scale={1.1} />
        <Wheel position={[1.0, 0.35, 1.5]} rotationY={wheelRotation} scale={1.1} />
        <Wheel position={[-1.0, 0.35, -1.5]} scale={1.1} />
        <Wheel position={[1.0, 0.35, -1.5]} scale={1.1} />
      </group>
    );
  }

  // --- SUV (Next 6) ---
  if (type === CarModelType.SUV) {
    return (
      <group position={[0, 0.2, 0]}>
        {/* Big Body */}
        <mesh position={[0, 0.8, 0]} castShadow>
          <boxGeometry args={[2.1, 1.0, 4.6]} />
          <meshStandardMaterial color={color} metalness={0.5} roughness={0.4} />
        </mesh>
        {/* Tall Cabin */}
        <mesh position={[0, 1.6, -0.2]}>
          <boxGeometry args={[1.9, 0.8, 2.8]} />
          <meshStandardMaterial color="#222" roughness={0.2} />
        </mesh>
        
        <Wheel position={[-1.0, 0.45, 1.6]} rotationY={wheelRotation} scale={1.4} />
        <Wheel position={[1.0, 0.45, 1.6]} rotationY={wheelRotation} scale={1.4} />
        <Wheel position={[-1.0, 0.45, -1.6]} scale={1.4} />
        <Wheel position={[1.0, 0.45, -1.6]} scale={1.4} />
      </group>
    );
  }

  // --- F1 CAR (Final 6) ---
  if (type === CarModelType.F1) {
    
    // Check names for custom liveries
    const isSauber = name?.includes('Sauber');     // Green with Black
    const isHaas = name?.includes('Haas');         // White with Red
    const isWilliams = name?.includes('Williams'); // Blue with Black
    const isMclaren = name?.includes('Mclarenn');  // Orange with Black
    const isMerc = name?.includes('Mercedess');    // Grey with Black & Turq
    const isFerrari = name?.includes('Ferrarii');  // Red with Black

    return (
      <group>
        {/* Narrow Main Body */}
        <mesh position={[0, 0.4, 0]} castShadow>
          <boxGeometry args={[0.7, 0.5, 4.8]} />
          <meshStandardMaterial color={color} metalness={0.6} roughness={0.2} />
        </mesh>
        
        {/* Custom Livery Stripes - Center Lines */}
        {(isSauber || isWilliams || isMclaren || isMerc || isFerrari) && (
            <mesh position={[0, 0.66, 0.2]}>
                <boxGeometry args={[0.2, 0.02, 2.5]} />
                <meshStandardMaterial color="#111" />
            </mesh>
        )}
        {isHaas && (
            <mesh position={[0, 0.66, 0.2]}>
                <boxGeometry args={[0.2, 0.02, 2.5]} />
                <meshStandardMaterial color="#cc0000" />
            </mesh>
        )}

        {/* Side Pods */}
        <mesh position={[0.6, 0.4, 0.5]}>
          <boxGeometry args={[0.5, 0.4, 2.0]} />
          <meshStandardMaterial color={color} metalness={0.6} roughness={0.2} />
        </mesh>
        {/* Side Pod Stripes */}
        {(isSauber || isWilliams || isMclaren || isFerrari) && (
             <mesh position={[0.6, 0.61, 0.5]} rotation={[-Math.PI/2, 0, 0]}>
                 <planeGeometry args={[0.3, 1.5]} />
                 <meshStandardMaterial color="#111" />
             </mesh>
        )}
        {isMerc && (
             <mesh position={[0.6, 0.61, 0.5]} rotation={[-Math.PI/2, 0, 0]}>
                 <planeGeometry args={[0.3, 1.5]} />
                 <meshStandardMaterial color="#00ffff" />
             </mesh>
        )}
        {isHaas && (
             <mesh position={[0.6, 0.61, 0.5]} rotation={[-Math.PI/2, 0, 0]}>
                 <planeGeometry args={[0.3, 1.5]} />
                 <meshStandardMaterial color="#cc0000" />
             </mesh>
        )}

        <mesh position={[-0.6, 0.4, 0.5]}>
          <boxGeometry args={[0.5, 0.4, 2.0]} />
          <meshStandardMaterial color={color} metalness={0.6} roughness={0.2} />
        </mesh>
        {/* Left Side Pod Stripes */}
        {(isSauber || isWilliams || isMclaren || isFerrari) && (
             <mesh position={[-0.6, 0.61, 0.5]} rotation={[-Math.PI/2, 0, 0]}>
                 <planeGeometry args={[0.3, 1.5]} />
                 <meshStandardMaterial color="#111" />
             </mesh>
        )}
        {isMerc && (
             <mesh position={[-0.6, 0.61, 0.5]} rotation={[-Math.PI/2, 0, 0]}>
                 <planeGeometry args={[0.3, 1.5]} />
                 <meshStandardMaterial color="#00ffff" />
             </mesh>
        )}
        {isHaas && (
             <mesh position={[-0.6, 0.61, 0.5]} rotation={[-Math.PI/2, 0, 0]}>
                 <planeGeometry args={[0.3, 1.5]} />
                 <meshStandardMaterial color="#cc0000" />
             </mesh>
        )}

        {/* Front Wing */}
        <mesh position={[0, 0.2, -2.6]}>
           <boxGeometry args={[2.2, 0.1, 0.6]} />
           <meshStandardMaterial color="#222" />
        </mesh>
        {/* Rear Wing */}
        <mesh position={[0, 1.0, 2.2]}>
           <boxGeometry args={[1.8, 0.1, 0.5]} />
           <meshStandardMaterial color="#222" />
        </mesh>
        {/* Cockpit */}
        <mesh position={[0, 0.7, -0.5]}>
           <boxGeometry args={[0.5, 0.3, 1.0]} />
           <meshStandardMaterial color="#111" />
        </mesh>

        {/* Exposed Wheels */}
        <Wheel position={[-0.9, 0.35, 1.6]} rotationY={wheelRotation} scale={1.1} />
        <Wheel position={[0.9, 0.35, 1.6]} rotationY={wheelRotation} scale={1.1} />
        <Wheel position={[-0.9, 0.35, -1.8]} scale={1.2} />
        <Wheel position={[0.9, 0.35, -1.8]} scale={1.2} />
      </group>
    );
  }

  return null;
};
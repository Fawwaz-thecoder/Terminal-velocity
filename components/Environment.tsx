import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { Weather } from '../types';

export const Environment: React.FC = () => {
  const { weather, isNight } = useGameStore();
  const rainRef = useRef<THREE.Points>(null);
  const snowRef = useRef<THREE.Points>(null);
  const lightRef = useRef<THREE.DirectionalLight>(null);
  
  // Weather Particles
  const rainGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const count = 2000;
    const pos = new Float32Array(count * 3);
    for(let i=0; i<count*3; i++) pos[i] = (Math.random() - 0.5) * 100;
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  const snowGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const count = 3000;
    const pos = new Float32Array(count * 3);
    for(let i=0; i<count*3; i++) pos[i] = (Math.random() - 0.5) * 100;
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    
    // Manual Day/Night Logic
    // Smoothly interpolate sun position based on isNight state
    // Day angle: PI/2 (overhead-ish), Night angle: -PI/2 (underground/horizon)
    const targetSunHeight = isNight ? -0.5 : 1.0;
    const currentPos = lightRef.current?.position.y || 10;
    const lerpedHeight = THREE.MathUtils.lerp(currentPos / 50, targetSunHeight, delta * 2);

    if (lightRef.current) {
        // Keep sun mostly overhead but dip it for night
        lightRef.current.position.set(10, lerpedHeight * 50, 10);
        
        // Intensity
        const targetIntensity = isNight ? 0.1 : 1.5;
        lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, targetIntensity, delta * 2);
        
        // Color
        if (isNight) {
             lightRef.current.color.setHSL(0.6, 0.5, 0.5); // Moon blue
        } else {
             lightRef.current.color.setHSL(0.1, 0.8, 0.95); // Warm sun
        }
    }
    
    // Update Fog based on weather and time
    const fogColorHex = isNight ? '#050510' : (weather === Weather.CLEAR ? '#87CEEB' : '#aaccff');
    const fogDensity = weather === Weather.CLEAR ? (isNight ? 0.015 : 0.01) : 0.04;
    
    // Smooth background transition (simple approach)
    state.scene.background = new THREE.Color(fogColorHex);
    // Re-creating fog every frame is heavy, but easiest for dynamic density/color mix without custom shader
    state.scene.fog = new THREE.FogExp2(fogColorHex, fogDensity);

    // Rain Animation
    if (rainRef.current && weather === Weather.RAIN) {
        const positions = rainRef.current.geometry.attributes.position.array as Float32Array;
        for(let i=1; i<positions.length; i+=3) {
            positions[i] -= 40 * delta;
            if (positions[i] < -20) positions[i] = 30;
        }
        rainRef.current.geometry.attributes.position.needsUpdate = true;
        // Keep rain localized to camera for infinite illusion
        rainRef.current.position.set(state.camera.position.x, state.camera.position.y, state.camera.position.z - 20);
    }

    // Snow Animation
    if (snowRef.current && weather === Weather.SNOW) {
        const positions = snowRef.current.geometry.attributes.position.array as Float32Array;
        for(let i=0; i<positions.length; i+=3) {
            positions[i+1] -= 5 * delta; // Y down
            positions[i] += Math.sin(time + i) * 0.1; // X wiggle
            if (positions[i+1] < -20) positions[i+1] = 30;
        }
        snowRef.current.geometry.attributes.position.needsUpdate = true;
        snowRef.current.position.set(state.camera.position.x, state.camera.position.y, state.camera.position.z - 20);
    }
  });

  return (
    <>
      <directionalLight ref={lightRef} castShadow shadow-mapSize={[2048, 2048]} />
      <ambientLight intensity={isNight ? 0.1 : 0.5} />
      
      {weather === Weather.RAIN && (
          <points ref={rainRef} geometry={rainGeo}>
              <pointsMaterial color="#aaaaaa" size={0.3} transparent opacity={0.6} sizeAttenuation />
          </points>
      )}
      
      {weather === Weather.SNOW && (
          <points ref={snowRef} geometry={snowGeo}>
              <pointsMaterial color="#ffffff" size={0.5} transparent opacity={0.8} sizeAttenuation />
          </points>
      )}
    </>
  );
};

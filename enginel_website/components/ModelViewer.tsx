'use client';

import { Suspense, useState, useRef, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid, Box, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

interface ModelViewerProps {
    modelUrl?: string;
    fileType?: string;
    fileName?: string;
}

function FallbackModel() {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.3;
        }
    });

    return (
        <group>
            <Box ref={meshRef} args={[2, 2, 2]}>
                <meshStandardMaterial color="#3b82f6" metalness={0.5} roughness={0.3} />
            </Box>
            <ContactShadows
                position={[0, -1.5, 0]}
                opacity={0.5}
                scale={10}
                blur={2}
                far={4}
            />
        </group>
    );
}

function STLModel({ modelUrl }: { modelUrl: string }) {
    const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { camera } = useThree();
    const meshRef = useRef<THREE.Mesh>(null);

    useEffect(() => {
        const loader = new STLLoader();
        setLoading(true);
        setError(null);

        loader.load(
            modelUrl,
            (loadedGeometry) => {
                // Center and compute normals
                loadedGeometry.center();
                loadedGeometry.computeVertexNormals();
                setGeometry(loadedGeometry);
                setLoading(false);

                // Fit camera to object
                setTimeout(() => {
                    if (meshRef.current) {
                        const box = new THREE.Box3().setFromObject(meshRef.current);
                        const center = box.getCenter(new THREE.Vector3());
                        const size = box.getSize(new THREE.Vector3());

                        const maxDim = Math.max(size.x, size.y, size.z);
                        const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
                        const cameraZ = Math.abs(maxDim / Math.tan(fov / 2));

                        camera.position.set(center.x + cameraZ * 0.8, center.y + cameraZ * 0.8, center.z + cameraZ * 0.8);
                        camera.lookAt(center);
                    }
                }, 100);
            },
            (progress) => {
                const percent = (progress.loaded / progress.total) * 100;
                console.log(`Loading STL: ${percent.toFixed(0)}%`);
            },
            (err) => {
                console.error('Error loading STL:', err);
                setError('Failed to load 3D model');
                setLoading(false);
            }
        );
    }, [modelUrl, camera]);

    if (error) {
        return <FallbackModel />;
    }

    if (loading || !geometry) {
        return <LoadingFallback />;
    }

    return (
        <group>
            <mesh ref={meshRef} geometry={geometry}>
                <meshPhongMaterial
                    color={0x606060}
                    specular={0x111111}
                    shininess={200}
                    side={THREE.DoubleSide}
                />
            </mesh>
            <ContactShadows
                position={[0, -1.5, 0]}
                opacity={0.5}
                scale={10}
                blur={2}
                far={4}
            />
        </group>
    );
}

function ModelContent({ modelUrl, fileType }: { modelUrl?: string; fileType?: string }) {
    if (!modelUrl) {
        return <FallbackModel />;
    }

    // Load STL files (preview from STEP conversion)
    const ext = fileType?.toLowerCase();
    if (ext === 'stl' || ext === 'step' || ext === 'stp') {
        return <STLModel modelUrl={modelUrl} />;
    }

    // Fallback for unsupported types
    return <FallbackModel />;
}

function LoadingFallback() {
    return (
        <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#6b7280" wireframe />
        </mesh>
    );
}

export default function ModelViewer({ modelUrl, fileType, fileName }: ModelViewerProps) {
    const [wireframe, setWireframe] = useState(false);
    const [showGrid, setShowGrid] = useState(true);
    const [autoRotate, setAutoRotate] = useState(false);

    return (
        <div className="relative w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            {/* 3D Canvas */}
            <Canvas shadows>
                <PerspectiveCamera makeDefault position={[5, 5, 5]} fov={50} />

                {/* Lighting */}
                <ambientLight intensity={0.5} />
                <directionalLight
                    position={[10, 10, 5]}
                    intensity={1}
                    castShadow
                    shadow-mapSize-width={2048}
                    shadow-mapSize-height={2048}
                />
                <pointLight position={[-10, -10, -10]} intensity={0.5} />

                {/* Environment */}
                <Environment preset="studio" />

                {/* Grid */}
                {showGrid && (
                    <Grid
                        args={[20, 20]}
                        cellSize={1}
                        cellThickness={0.5}
                        cellColor="#6b7280"
                        sectionSize={5}
                        sectionThickness={1}
                        sectionColor="#3b82f6"
                        fadeDistance={30}
                        fadeStrength={1}
                        position={[0, -1.5, 0]}
                    />
                )}

                {/* Model */}
                <Suspense fallback={<LoadingFallback />}>
                    <ModelContent modelUrl={modelUrl} fileType={fileType} />
                </Suspense>

                {/* Controls */}
                <OrbitControls
                    enableDamping
                    dampingFactor={0.05}
                    autoRotate={autoRotate}
                    autoRotateSpeed={1}
                    minDistance={2}
                    maxDistance={20}
                />
            </Canvas>

            {/* Control Panel */}
            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4 space-y-3">
                <div className="text-sm font-semibold text-gray-900 mb-2">
                    View Controls
                </div>

                <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={wireframe}
                        onChange={(e) => setWireframe(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Wireframe</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={showGrid}
                        onChange={(e) => setShowGrid(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Show Grid</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={autoRotate}
                        onChange={(e) => setAutoRotate(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Auto Rotate</span>
                </label>

                <div className="pt-2 border-t border-gray-200">
                    <div className="text-xs text-gray-500">
                        <div className="font-medium mb-1">Controls:</div>
                        <div>• Left click + drag: Rotate</div>
                        <div>• Right click + drag: Pan</div>
                        <div>• Scroll: Zoom</div>
                    </div>
                </div>
            </div>

            {/* File Info */}
            {fileName && (
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg px-4 py-2">
                    <div className="text-xs text-gray-500">File</div>
                    <div className="text-sm font-medium text-gray-900">{fileName}</div>
                    {fileType && (
                        <div className="text-xs text-gray-600 mt-1">Type: {fileType}</div>
                    )}
                </div>
            )}

            {/* View Angles Quick Actions */}
            <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2">
                <div className="text-xs text-gray-500 mb-2 px-2">Quick Views</div>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                        onClick={() => {/* TODO: Set camera to front view */ }}
                    >
                        Front
                    </button>
                    <button
                        className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                        onClick={() => {/* TODO: Set camera to top view */ }}
                    >
                        Top
                    </button>
                    <button
                        className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                        onClick={() => {/* TODO: Set camera to side view */ }}
                    >
                        Side
                    </button>
                    <button
                        className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                        onClick={() => {/* TODO: Set camera to isometric view */ }}
                    >
                        ISO
                    </button>
                </div>
            </div>
        </div>
    );
}

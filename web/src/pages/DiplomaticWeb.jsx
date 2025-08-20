import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Network, 
  Globe, 
  Filter,
  Info,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from "lucide-react";
import { Alliance, Treaty } from "@/api/entities";
import * as THREE from 'three';

// Treaty type configurations
const TREATY_COLORS = {
  "MDP": "#ef4444",        // Red
  "ODoAP": "#f97316",      // Orange  
  "MDoAP": "#eab308",      // Yellow
  "Protectorate": "#3b82f6", // Blue
  "Extension": "#8b5cf6",   // Purple
  "NAP": "#22c55e"         // Green
};

const TREATY_LABELS = {
  "MDP": "Mutual Defense Pact",
  "ODoAP": "Optional Defense Optional Aggression Pact", 
  "MDoAP": "Mutual Defense Optional Aggression Pact",
  "Protectorate": "Protectorate",
  "Extension": "Extension",
  "NAP": "Non-Aggression Pact"
};

export default function DiplomaticWebPage() {
  const [alliances, setAlliances] = useState([]);
  const [treaties, setTreaties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleTreaties, setVisibleTreaties] = useState({
    MDP: true,
    ODoAP: true,
    MDoAP: true,
    Protectorate: true,
    Extension: true,
    NAP: true
  });
  const [selectedAlliance, setSelectedAlliance] = useState(null);

  // Three.js refs
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const nodesRef = useRef([]);
  const linksRef = useRef([]);
  const animationIdRef = useRef(null);

  useEffect(() => {
    loadDiplomaticData();
    return () => {
      // Cleanup
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (alliances.length > 0 && treaties.length >= 0) {
      initializeVisualization();
    }
  }, [alliances, treaties]);

  useEffect(() => {
    updateTreatyVisibility();
  }, [visibleTreaties]);

  const loadDiplomaticData = async () => {
    setIsLoading(true);
    try {
      const [alliancesData, treatiesData] = await Promise.all([
        Alliance.list(),
        Treaty.list()
      ]);

      const activeAlliances = alliancesData.filter(a => a.active);
      const activeTreaties = treatiesData.filter(t => t.status === 'active');

      setAlliances(activeAlliances);
      setTreaties(activeTreaties);
    } catch (error) {
      console.error("Error loading diplomatic data:", error);
    }
    setIsLoading(false);
  };

  const initializeVisualization = () => {
    if (!mountRef.current) return;

    // Clear previous visualization
    while (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 50;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create nodes and links
    createNodes();
    createLinks();

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      updatePhysics();
      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      if (mountRef.current) {
        camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);
  };

  const createNodes = () => {
    nodesRef.current = [];
    
    alliances.forEach((alliance, index) => {
      // Create node geometry and material
      const geometry = new THREE.CircleGeometry(2, 16);
      const material = new THREE.MeshBasicMaterial({ 
        color: 0x64748b,
        transparent: true,
        opacity: 0.8
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      
      // Position nodes in a rough circle initially
      const angle = (index / alliances.length) * Math.PI * 2;
      const radius = Math.min(alliances.length * 2, 30);
      mesh.position.x = Math.cos(angle) * radius;
      mesh.position.y = Math.sin(angle) * radius;
      
      // Store alliance data and physics properties
      mesh.userData = {
        alliance,
        velocity: new THREE.Vector3(0, 0, 0),
        force: new THREE.Vector3(0, 0, 0)
      };

      sceneRef.current.add(mesh);
      nodesRef.current.push(mesh);

      // Add alliance name label
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 256;
      canvas.height = 64;
      
      context.fillStyle = '#ffffff';
      context.font = '16px Arial';
      context.textAlign = 'center';
      context.fillText(alliance.name, 128, 32);
      
      const texture = new THREE.CanvasTexture(canvas);
      const labelMaterial = new THREE.SpriteMaterial({ map: texture });
      const label = new THREE.Sprite(labelMaterial);
      label.scale.set(8, 2, 1);
      label.position.copy(mesh.position);
      label.position.y -= 4;
      
      sceneRef.current.add(label);
      mesh.userData.label = label;
    });
  };

  const createLinks = () => {
    linksRef.current = [];
    
    treaties.forEach(treaty => {
      const alliance1 = alliances.find(a => a.id === treaty.alliance_1_id);
      const alliance2 = alliances.find(a => a.id === treaty.alliance_2_id);
      
      if (!alliance1 || !alliance2) return;
      
      const node1 = nodesRef.current.find(n => n.userData.alliance.id === alliance1.id);
      const node2 = nodesRef.current.find(n => n.userData.alliance.id === alliance2.id);
      
      if (!node1 || !node2) return;

      // Create line geometry
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(6); // 2 points * 3 coordinates
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      
      const material = new THREE.LineBasicMaterial({
        color: TREATY_COLORS[treaty.treaty_type] || 0xffffff,
        linewidth: 2,
        transparent: true,
        opacity: 0.7
      });
      
      const line = new THREE.Line(geometry, material);
      line.userData = { treaty, node1, node2 };
      
      sceneRef.current.add(line);
      linksRef.current.push(line);
    });
  };

  const updatePhysics = () => {
    const nodes = nodesRef.current;
    
    // Reset forces
    nodes.forEach(node => {
      node.userData.force.set(0, 0, 0);
    });

    // Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const node1 = nodes[i];
        const node2 = nodes[j];
        
        const dx = node1.position.x - node2.position.x;
        const dy = node1.position.y - node2.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 0.1) continue;
        
        const repulsion = 50 / (distance * distance);
        const fx = (dx / distance) * repulsion;
        const fy = (dy / distance) * repulsion;
        
        node1.userData.force.x += fx;
        node1.userData.force.y += fy;
        node2.userData.force.x -= fx;
        node2.userData.force.y -= fy;
      }
    }

    // Attraction along treaty links
    linksRef.current.forEach(link => {
      if (!link.visible) return;
      
      const { node1, node2 } = link.userData;
      const dx = node2.position.x - node1.position.x;
      const dy = node2.position.y - node1.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const attraction = 0.01 * (distance - 15);
      const fx = (dx / distance) * attraction;
      const fy = (dy / distance) * attraction;
      
      node1.userData.force.x += fx;
      node1.userData.force.y += fy;
      node2.userData.force.x -= fx;
      node2.userData.force.y -= fy;
    });

    // Apply forces and update positions
    nodes.forEach(node => {
      const { velocity, force } = node.userData;
      
      // Apply damping
      velocity.multiplyScalar(0.9);
      
      // Apply force
      velocity.add(force.multiplyScalar(0.1));
      
      // Update position
      node.position.add(velocity.clone().multiplyScalar(0.1));
      
      // Update label position
      if (node.userData.label) {
        node.userData.label.position.copy(node.position);
        node.userData.label.position.y -= 4;
      }
    });

    // Update link positions
    linksRef.current.forEach(link => {
      const { node1, node2 } = link.userData;
      const positions = link.geometry.attributes.position.array;
      
      positions[0] = node1.position.x;
      positions[1] = node1.position.y;
      positions[2] = node1.position.z;
      positions[3] = node2.position.x;
      positions[4] = node2.position.y;
      positions[5] = node2.position.z;
      
      link.geometry.attributes.position.needsUpdate = true;
    });
  };

  const updateTreatyVisibility = () => {
    linksRef.current.forEach(link => {
      const treatyType = link.userData.treaty.treaty_type;
      link.visible = visibleTreaties[treatyType] || false;
    });
  };

  const handleTreatyToggle = (treatyType) => {
    setVisibleTreaties(prev => ({
      ...prev,
      [treatyType]: !prev[treatyType]
    }));
  };

  const resetView = () => {
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 0, 50);
      cameraRef.current.lookAt(0, 0, 0);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center h-full">
        <div className="text-center">
          <Network className="w-16 h-16 text-amber-400 mx-auto mb-4 animate-pulse" />
          <p className="text-white text-xl">Loading diplomatic web...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 h-screen flex flex-col">
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
          <Network className="w-10 h-10 text-purple-400" />
          Diplomatic Web
        </h1>
        <p className="text-xl text-slate-400">
          Interactive visualization of all active treaties between alliances
        </p>
      </div>

      {/* Controls */}
      <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm mb-6">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-400" />
            Treaty Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            {Object.entries(TREATY_LABELS).map(([type, label]) => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox
                  id={type}
                  checked={visibleTreaties[type]}
                  onCheckedChange={() => handleTreatyToggle(type)}
                />
                <label
                  htmlFor={type}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  style={{ color: TREATY_COLORS[type] }}
                >
                  {type}
                </label>
                <Badge 
                  className="ml-1 text-xs"
                  style={{ 
                    backgroundColor: TREATY_COLORS[type] + '20',
                    color: TREATY_COLORS[type],
                    borderColor: TREATY_COLORS[type] + '50'
                  }}
                >
                  {treaties.filter(t => t.treaty_type === type && visibleTreaties[type]).length}
                </Badge>
              </div>
            ))}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={resetView}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset View
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Visualization */}
      <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm flex-1">
        <CardContent className="p-0 h-full">
          <div 
            ref={mountRef} 
            className="w-full h-full min-h-[600px] rounded-lg overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
          />
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-800/80 border-slate-700">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-white">{alliances.length}</div>
            <div className="text-sm text-slate-400">Active Alliances</div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800/80 border-slate-700">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-white">
              {treaties.filter(t => Object.values(visibleTreaties).some(v => v)).length}
            </div>
            <div className="text-sm text-slate-400">Active Treaties</div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800/80 border-slate-700">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-white">
              {Object.values(visibleTreaties).filter(Boolean).length}
            </div>
            <div className="text-sm text-slate-400">Visible Types</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
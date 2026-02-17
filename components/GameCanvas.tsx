import React, { useRef, useEffect, useCallback } from 'react';
import { COLORS, GAME_CONFIG } from '../constants';
import { Point, Particle, Target, SoundType, TargetType } from '../types';
import { audioService } from '../services/audioService';

interface GameCanvasProps {
  isPlaying: boolean;
  score: number; // Needed for difficulty scaling
  onTargetDestroyed: (points: number) => void;
  onPlayerHit: (damage: number) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ isPlaying, score, onTargetDestroyed, onPlayerHit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const lastShotTimeRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const targetsRef = useRef<Target[]>([]);
  const mouseRef = useRef<Point>({ x: 0, y: 0 });
  const laserBeamRef = useRef<{ start: Point; end: Point; life: number; hit: boolean; isPowered: boolean } | null>(null);
  const lastSpawnTimeRef = useRef<number>(0);
  const powerUpEndTimeRef = useRef<number>(0);

  // Difficulty Logic
  const getDifficulty = useCallback(() => {
    let speed = 2.0; // Base speed
    let spawnRate = 2000;
    let bombChance = 0.0;
    let powerUpChance = 0.0;

    // Speed Scaling: Increase by 50% at specific thresholds
    // Logic: Base -> +50% -> +50% ...
    if (score >= 2000) speed *= 1.5;
    if (score >= 6000) speed *= 1.5;
    if (score >= 10000) speed *= 1.5;
    if (score >= 14000) speed *= 1.5;

    // Spawn Rate Scaling
    if (score >= 2000) spawnRate = 1800;
    if (score >= 6000) spawnRate = 1600;
    
    // Target Composition at 5000+ (Changed from 10000)
    if (score >= 5000) {
      spawnRate = 1400;
      bombChance = 0.40; // 40% Bomb
      powerUpChance = 0.05; // 5% Powerup
    }
    
    if (score >= 14000) spawnRate = 1200;

    return { speed, spawnRate, bombChance, powerUpChance };
  }, [score]);

  // Initialize Target
  const spawnTarget = useCallback((width: number, laneIndex: number, type: TargetType) => {
    const laneWidth = width / 3;
    const x = laneWidth * laneIndex + laneWidth / 2;
    
    // Determine props based on type
    let radius = 40;
    let maxHealth = 1;
    
    if (type === TargetType.BOMB) {
        radius = 50;
        maxHealth = 2;
    } else if (type === TargetType.POWERUP) {
        radius = 35;
        maxHealth = 1;
    }

    targetsRef.current.push({
      id: Date.now() + Math.random(),
      x: x,
      y: -100, // Start above screen
      lane: laneIndex,
      radius: radius,
      health: maxHealth,
      maxHealth: maxHealth,
      type: type,
      active: true,
      shatterProgress: 0,
    });
  }, []);

  // Particle System
  const createExplosion = (x: number, y: number, color: string, isBig: boolean = false) => {
    const count = isBig ? 40 : 20;
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        id: Math.random(),
        x,
        y,
        vx: (Math.random() - 0.5) * (isBig ? 25 : 15),
        vy: (Math.random() - 0.5) * (isBig ? 25 : 15),
        life: 1.0,
        maxLife: 1.0,
        color: color,
        size: Math.random() * 4 + 2,
      });
    }
  };

  const fireLaser = useCallback((width: number, height: number) => {
    // Gun position (Bottom Center)
    const gunX = width / 2;
    const gunY = height;

    // Mouse aiming
    const aimX = mouseRef.current.x;
    const aimY = mouseRef.current.y;

    // Check Powerup State
    const isPoweredUp = Date.now() < powerUpEndTimeRef.current;
    const laserDamage = isPoweredUp ? 2 : 1; // Double damage
    // If powered up, hit tolerance is doubled (range increases visually and physically)
    const hitToleranceMultiplier = isPoweredUp ? 2.0 : 1.0; 

    // Raycast logic
    let hitTarget: Target | null = null;
    let hitDistance = Infinity;

    targetsRef.current.forEach(target => {
        if (!target.active) return;
        
        // Vector from gun to target
        const dx = target.x - gunX;
        const dy = target.y - gunY;
        const distToTarget = Math.sqrt(dx*dx + dy*dy);

        // Vector from gun to mouse (aim direction)
        const aimDx = aimX - gunX;
        const aimDy = aimY - gunY;
        const aimDist = Math.sqrt(aimDx*aimDx + aimDy*aimDy);
        
        // Normalize aim vector
        const dirX = aimDx / aimDist;
        const dirY = aimDy / aimDist;

        // Project target center onto aim vector
        const t = dx * dirX + dy * dirY;
        
        // Closest point on line to circle center
        const closestX = gunX + t * dirX;
        const closestY = gunY + t * dirY;
        
        // Distance from closest point to circle center
        const distX = closestX - target.x;
        const distY = closestY - target.y;
        const distFromLine = Math.sqrt(distX*distX + distY*distY);

        // Hit Check with Multiplier
        // We use target.radius as the base "hitbox", multiplied by tolerance
        if (distFromLine < (target.radius * hitToleranceMultiplier) && t > 0 && t < aimDist + 100) {
             if (distToTarget < hitDistance) {
                 hitDistance = distToTarget;
                 hitTarget = target;
             }
        }
    });

    // Handle Hit
    if (hitTarget) {
        const t = hitTarget as Target;
        t.health -= laserDamage;
        
        if (t.health <= 0) {
            t.active = false;
            let explosionColor = COLORS.secondary;
            let isBigExplosion = false;

            if (t.type === TargetType.BOMB) {
                explosionColor = COLORS.danger;
                isBigExplosion = true;
            } else if (t.type === TargetType.POWERUP) {
                explosionColor = COLORS.success;
                isBigExplosion = true;
                // Activate Powerup
                powerUpEndTimeRef.current = Date.now() + 20000; // 20 seconds
                audioService.playSound(SoundType.UI_HOVER); // Upgrade sound
            }

            createExplosion(t.x, t.y, explosionColor, isBigExplosion);
            audioService.playSound(SoundType.EXPLOSION);
            onTargetDestroyed(100); 
        } else {
            // Hit but not destroyed (Bomb first hit without powerup)
            createExplosion(t.x, t.y, '#ffffff', false); // Small spark
            audioService.playSound(SoundType.UI_CLICK); // Metallic hit sound
        }
    }

    // Visuals
    const endX = hitTarget ? (hitTarget as Target).x : aimX;
    const endY = hitTarget ? (hitTarget as Target).y : aimY;

    // Extend beam if missed
    let finalEndX = endX;
    let finalEndY = endY;
    if (!hitTarget) {
        const angle = Math.atan2(aimY - gunY, aimX - gunX);
        finalEndX = gunX + Math.cos(angle) * 2000;
        finalEndY = gunY + Math.sin(angle) * 2000;
    }

    laserBeamRef.current = {
        start: { x: gunX, y: gunY },
        end: { x: finalEndX, y: finalEndY },
        life: 1.0,
        hit: !!hitTarget,
        isPowered: isPoweredUp
    };
    
    audioService.playSound(SoundType.LASER);

  }, [onTargetDestroyed]);

  const update = useCallback((time: number, width: number, height: number, ctx: CanvasRenderingContext2D) => {
    const { speed, spawnRate, bombChance, powerUpChance } = getDifficulty();

    // 1. Spawning
    if (isPlaying) {
        if (time - lastSpawnTimeRef.current > spawnRate) {
            const lane = Math.floor(Math.random() * 3);
            
            const rand = Math.random();
            let type = TargetType.NORMAL;
            
            // Logic:
            // if rand < 0.05 -> Powerup (5%)
            // else if rand < 0.45 -> Bomb (40%)
            // else -> Normal
            
            if (powerUpChance > 0 && rand < powerUpChance) {
                type = TargetType.POWERUP;
            } else if (bombChance > 0 && rand < (powerUpChance + bombChance)) {
                type = TargetType.BOMB;
            }

            spawnTarget(width, lane, type);
            lastSpawnTimeRef.current = time;
        }
    } else {
        // Menu Mode: Keep random floating targets
        if (targetsRef.current.length < 3) {
             targetsRef.current.push({
                id: Date.now(),
                x: width / 2 + (Math.random() * 400 - 200),
                y: height / 2 + (Math.random() * 200 - 100),
                lane: 1,
                radius: 40,
                health: 1,
                maxHealth: 1,
                type: TargetType.NORMAL,
                active: true,
                shatterProgress: 0
             });
        }
    }

    // 2. Update Targets
    targetsRef.current.forEach(t => {
        if (isPlaying) {
            t.y += speed;
            
            // Collision with Player
            if (t.y > height && t.active) {
                t.active = false;
                const damage = t.type === TargetType.BOMB ? 2 : 1;
                onPlayerHit(damage);
                createExplosion(t.x, height - 50, COLORS.danger, true);
                audioService.playSound(SoundType.EXPLOSION); 
            }
        } else {
            t.y += Math.sin(time / 500) * 0.5;
        }
    });

    // Cleanup
    targetsRef.current = targetsRef.current.filter(t => t.active);

    // Auto-fire logic for Menu
    if (!isPlaying) {
        if (time - lastShotTimeRef.current > 1000 && targetsRef.current.length > 0) {
            const target = targetsRef.current[0];
            const gunX = width / 2;
            const gunY = height;
            laserBeamRef.current = {
                start: { x: gunX, y: gunY },
                end: { x: target.x, y: target.y },
                life: 1.0,
                hit: true,
                isPowered: false
            };
            createExplosion(target.x, target.y, COLORS.secondary);
            target.active = false;
            lastShotTimeRef.current = time;
            audioService.playSound(SoundType.LASER);
        }
    }

    // 3. Physics
    particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += GAME_CONFIG.gravity;
        p.vx *= GAME_CONFIG.friction;
        p.vy *= GAME_CONFIG.friction;
        p.life -= 0.02;
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);

    // 4. Laser fade
    if (laserBeamRef.current) {
        laserBeamRef.current.life -= 0.1;
        if (laserBeamRef.current.life <= 0) laserBeamRef.current = null;
    }
  }, [isPlaying, spawnTarget, getDifficulty, onPlayerHit]);

  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);

    // --- Background ---
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.1)';
    ctx.lineWidth = 1;
    const time = Date.now() / 1000;
    
    // Draw Lanes
    const laneWidth = width / 3;
    ctx.fillStyle = 'rgba(0, 243, 255, 0.02)';
    if (isPlaying) {
        for(let i=0; i<3; i++) {
            ctx.fillRect(i * laneWidth + 10, 0, laneWidth - 20, height);
            ctx.beginPath();
            ctx.moveTo(i * laneWidth, 0);
            ctx.lineTo(i * laneWidth, height);
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(3 * laneWidth, 0);
        ctx.lineTo(3 * laneWidth, height);
        ctx.stroke();
    }

    // Moving grid
    ctx.beginPath();
    const scrollY = (time * 100) % 100;
    for (let y = 0; y <= height; y += 100) {
        const drawY = isPlaying ? (y + scrollY) % height : y;
        ctx.moveTo(0, drawY);
        ctx.lineTo(width, drawY);
    }
    ctx.stroke();

    // --- Targets ---
    targetsRef.current.forEach(target => {
        if (!target.active) return;
        ctx.save();
        ctx.translate(target.x, target.y);
        
        const pulse = Math.sin(time * 10) * 2;
        
        if (target.type === TargetType.BOMB) {
            // BOMB (Red)
            ctx.strokeStyle = COLORS.danger;
            ctx.fillStyle = 'rgba(255, 42, 42, 0.2)';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 20;
            ctx.shadowColor = COLORS.danger;
            ctx.rotate(time * 3);
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                ctx.rotate(Math.PI / 4);
                ctx.moveTo(target.radius, 0);
                ctx.lineTo(target.radius * 0.5, 10);
                ctx.lineTo(target.radius * 0.5, -10);
                ctx.lineTo(target.radius, 0);
            }
            ctx.fill();
            ctx.stroke();

            // Inner core
            ctx.beginPath();
            ctx.arc(0, 0, target.radius * 0.4 + pulse, 0, Math.PI * 2);
            ctx.fillStyle = COLORS.danger;
            ctx.fill();
            
            if (target.health < target.maxHealth) {
                ctx.fillStyle = '#fff';
                ctx.font = '20px Orbitron';
                ctx.fillText("CRITICAL", -30, 0);
            }

        } else if (target.type === TargetType.POWERUP) {
            // POWERUP (Green)
            ctx.strokeStyle = COLORS.success;
            ctx.fillStyle = 'rgba(0, 255, 65, 0.2)';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 20;
            ctx.shadowColor = COLORS.success;

            // Hexagon Shape
            ctx.rotate(time * 2);
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i;
                const x = Math.cos(angle) * target.radius;
                const y = Math.sin(angle) * target.radius;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = COLORS.success;
            ctx.font = '700 16px Orbitron';
            ctx.fillText("UPGRADE", -40, 5);

        } else {
            // NORMAL (Cyan)
            ctx.strokeStyle = COLORS.secondary;
            ctx.lineWidth = 3;
            ctx.shadowBlur = 15;
            ctx.shadowColor = COLORS.secondary;
            
            ctx.rotate(time);
            ctx.beginPath();
            ctx.arc(0, 0, target.radius + pulse, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.rotate(-time * 2);
            ctx.fillStyle = 'rgba(255, 0, 255, 0.2)';
            ctx.fillRect(-20, -20, 40, 40);
            
            ctx.fillStyle = COLORS.text;
            ctx.font = '10px Orbitron';
            ctx.fillText("100pts", -15, 4);
        }
        
        ctx.restore();
    });

    // --- Particles ---
    particlesRef.current.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.vx * 2, p.y + p.vy * 2);
        ctx.lineTo(p.x + p.size, p.y);
        ctx.fill();
        ctx.restore();
    });

    // --- Laser ---
    if (laserBeamRef.current) {
        const beam = laserBeamRef.current;
        const color = beam.isPowered ? COLORS.success : COLORS.primary;
        const width = beam.isPowered ? 15 + (Math.random() * 8) : 4 + (Math.random() * 4); // Thicker if powered

        ctx.save();
        ctx.globalAlpha = beam.life;
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.shadowBlur = beam.isPowered ? 40 : 20;
        ctx.shadowColor = color;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(beam.start.x, beam.start.y);
        ctx.lineTo(beam.end.x, beam.end.y);
        ctx.stroke();
        
        if (beam.hit) {
            ctx.fillStyle = COLORS.accent;
            ctx.beginPath();
            ctx.arc(beam.end.x, beam.end.y, (beam.isPowered ? 40 : 20) * beam.life, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }

    // --- Gun (Dynamic) ---
    const gunX = width / 2;
    const gunY = height;
    const isPoweredUp = Date.now() < powerUpEndTimeRef.current;
    
    let aimAngle = -Math.PI / 2;
    if (isPlaying) {
         aimAngle = Math.atan2(mouseRef.current.y - gunY, mouseRef.current.x - gunX);
    }

    ctx.save();
    ctx.translate(gunX, gunY);
    ctx.rotate(aimAngle);
    
    // Gun Body
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = isPoweredUp ? COLORS.success : COLORS.primary;
    ctx.lineWidth = 2;
    
    // Base
    ctx.beginPath();
    ctx.roundRect(-20, -20, 40, 40, 5);
    ctx.fill();
    ctx.stroke();
    
    // Barrel
    ctx.fillStyle = '#1e293b';
    // If powered up, barrel pulses green
    if (isPoweredUp) {
         ctx.shadowBlur = 20;
         ctx.shadowColor = COLORS.success;
    }
    ctx.fillRect(0, -10, 60, 20);
    ctx.strokeRect(0, -10, 60, 20);
    
    // Energy Core
    ctx.fillStyle = isPoweredUp ? COLORS.success : COLORS.primary;
    if (!isPoweredUp) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = COLORS.primary;
    }
    ctx.fillRect(10, -4, 40, 8);
    
    ctx.restore();

    // Crosshair (Mouse)
    if (isPlaying) {
        ctx.strokeStyle = isPoweredUp ? COLORS.success : COLORS.danger;
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        
        // Aim line from gun
        ctx.beginPath();
        ctx.moveTo(gunX, gunY);
        ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
        ctx.strokeStyle = isPoweredUp ? 'rgba(0, 255, 65, 0.2)' : 'rgba(0, 243, 255, 0.2)';
        ctx.stroke();

        // Cursor
        ctx.beginPath();
        const cursorSize = isPoweredUp ? 30 : 15; // Bigger cursor for bigger hitbox range
        ctx.arc(mouseRef.current.x, mouseRef.current.y, cursorSize, 0, Math.PI * 2);
        ctx.moveTo(mouseRef.current.x - (cursorSize+5), mouseRef.current.y);
        ctx.lineTo(mouseRef.current.x + (cursorSize+5), mouseRef.current.y);
        ctx.moveTo(mouseRef.current.x, mouseRef.current.y - (cursorSize+5));
        ctx.lineTo(mouseRef.current.x, mouseRef.current.y + (cursorSize+5));
        ctx.stroke();
        
        if (isPoweredUp) {
             ctx.fillStyle = COLORS.success;
             ctx.font = '10px Orbitron';
             ctx.fillText("MAX_POWER", mouseRef.current.x + 20, mouseRef.current.y - 20);
        }
    }

  }, [isPlaying]);

  const loop = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    update(time, canvas.width, canvas.height, ctx);
    draw(ctx, canvas.width, canvas.height);
    
    requestRef.current = requestAnimationFrame(loop);
  }, [update, draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const handleMouseMove = (e: MouseEvent) => {
        mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    
    const handleMouseDown = (e: MouseEvent) => {
        if (isPlaying) {
            fireLaser(canvas.width, canvas.height);
        }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);

    requestRef.current = requestAnimationFrame(loop);

    return () => {
        window.removeEventListener('resize', resize);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mousedown', handleMouseDown);
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [loop, isPlaying, fireLaser]);

  return <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full z-0 block" />;
};

export default GameCanvas;
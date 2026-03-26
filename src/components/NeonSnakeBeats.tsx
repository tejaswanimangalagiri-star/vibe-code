import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Terminal } from 'lucide-react';

const TRACKS = [
  { id: 1, title: "SYS.TRACK_01 // NEON_PULSE", artist: "ENTITY_A", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { id: 2, title: "SYS.TRACK_02 // DIGITAL_HORIZON", artist: "ENTITY_B", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { id: 3, title: "SYS.TRACK_03 // QUANTUM_GROOVE", artist: "ENTITY_C", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" }
];

const GRID_COUNT = 20;
const CANVAS_SIZE = 400;
const TILE_SIZE = CANVAS_SIZE / GRID_COUNT;
const MOVE_INTERVAL = 100;

type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string };

export default function GlitchSystem() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const requestRef = useRef<number>();
  
  const [score, setScore] = useState(0);
  const [uiStatus, setUiStatus] = useState<'IDLE' | 'PLAYING' | 'GAME_OVER'>('IDLE');
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);

  const gameState = useRef({
    snake: [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }],
    dir: { x: 0, y: -1 },
    nextDir: { x: 0, y: -1 },
    food: { x: 5, y: 5 },
    particles: [] as Particle[],
    shakeTime: 0,
    lastMoveTime: 0,
    status: 'IDLE' as 'IDLE' | 'PLAYING' | 'GAME_OVER'
  });

  const updateStatus = useCallback((newStatus: 'IDLE' | 'PLAYING' | 'GAME_OVER') => {
    gameState.current.status = newStatus;
    setUiStatus(newStatus);
  }, []);

  // Audio Logic
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (isPlaying) {
      audioRef.current?.play().catch(() => setIsPlaying(false));
    } else {
      audioRef.current?.pause();
    }
  }, [isPlaying, currentTrackIndex]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const nextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
    setIsPlaying(true);
  };
  const prevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    setIsPlaying(true);
  };

  // Keyboard Logic
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
      
      const state = gameState.current;
      
      if (e.key === ' ') {
        if (state.status === 'IDLE' || state.status === 'GAME_OVER') {
          state.snake = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
          state.dir = { x: 0, y: -1 };
          state.nextDir = { x: 0, y: -1 };
          state.food = { x: Math.floor(Math.random() * GRID_COUNT), y: Math.floor(Math.random() * GRID_COUNT) };
          state.particles = [];
          state.shakeTime = 0;
          state.lastMoveTime = performance.now();
          setScore(0);
          updateStatus('PLAYING');
        }
        return;
      }

      if (state.status !== 'PLAYING') return;

      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W':
          if (state.dir.y !== 1) state.nextDir = { x: 0, y: -1 };
          break;
        case 'ArrowDown': case 's': case 'S':
          if (state.dir.y !== -1) state.nextDir = { x: 0, y: 1 };
          break;
        case 'ArrowLeft': case 'a': case 'A':
          if (state.dir.x !== 1) state.nextDir = { x: -1, y: 0 };
          break;
        case 'ArrowRight': case 'd': case 'D':
          if (state.dir.x !== -1) state.nextDir = { x: 1, y: 0 };
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [updateStatus]);

  // Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const spawnParticles = (x: number, y: number, color: string) => {
      for (let i = 0; i < 20; i++) {
        gameState.current.particles.push({
          x: x * TILE_SIZE + TILE_SIZE / 2,
          y: y * TILE_SIZE + TILE_SIZE / 2,
          vx: (Math.random() - 0.5) * 15,
          vy: (Math.random() - 0.5) * 15,
          life: 20 + Math.random() * 30,
          maxLife: 50,
          color
        });
      }
    };

    const render = (time: number) => {
      const state = gameState.current;
      
      if (state.status === 'PLAYING') {
        if (time - state.lastMoveTime > MOVE_INTERVAL) {
          state.lastMoveTime = time;
          state.dir = state.nextDir;
          
          const head = state.snake[0];
          const newHead = { x: head.x + state.dir.x, y: head.y + state.dir.y };
          
          if (newHead.x < 0 || newHead.x >= GRID_COUNT || newHead.y < 0 || newHead.y >= GRID_COUNT || state.snake.some(s => s.x === newHead.x && s.y === newHead.y)) {
            updateStatus('GAME_OVER');
            state.shakeTime = 500;
            spawnParticles(head.x, head.y, '#FF00FF');
          } else {
            state.snake.unshift(newHead);
            if (newHead.x === state.food.x && newHead.y === state.food.y) {
              setScore(s => s + 1);
              state.shakeTime = 100;
              spawnParticles(state.food.x, state.food.y, '#00FFFF');
              
              let newFood;
              while (true) {
                newFood = { x: Math.floor(Math.random() * GRID_COUNT), y: Math.floor(Math.random() * GRID_COUNT) };
                if (!state.snake.some(s => s.x === newFood.x && s.y === newFood.y)) break;
              }
              state.food = newFood;
            } else {
              state.snake.pop();
            }
          }
        }
      }

      // Update particles
      state.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1;
      });
      state.particles = state.particles.filter(p => p.life > 0);
      
      if (state.shakeTime > 0) {
        state.shakeTime -= 16;
      }

      // Draw
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      if (state.shakeTime > 0) {
        const dx = (Math.random() - 0.5) * 15;
        const dy = (Math.random() - 0.5) * 15;
        ctx.translate(dx, dy);
      }

      // Draw grid
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1;
      for (let i = 0; i <= GRID_COUNT; i++) {
        ctx.beginPath();
        ctx.moveTo(i * TILE_SIZE, 0);
        ctx.lineTo(i * TILE_SIZE, CANVAS_SIZE);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * TILE_SIZE);
        ctx.lineTo(CANVAS_SIZE, i * TILE_SIZE);
        ctx.stroke();
      }

      // Draw food
      if (state.status !== 'GAME_OVER') {
        ctx.fillStyle = '#FF00FF';
        ctx.shadowColor = '#FF00FF';
        ctx.shadowBlur = 15;
        ctx.fillRect(state.food.x * TILE_SIZE + 2, state.food.y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        ctx.shadowBlur = 0;
      }

      // Draw snake
      state.snake.forEach((segment, i) => {
        ctx.fillStyle = i === 0 ? '#FFFFFF' : '#00FFFF';
        ctx.shadowColor = '#00FFFF';
        ctx.shadowBlur = i === 0 ? 20 : 5;
        ctx.fillRect(segment.x * TILE_SIZE + 1, segment.y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        ctx.shadowBlur = 0;
      });

      // Draw particles
      state.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillRect(p.x, p.y, 4, 4);
      });

      ctx.restore();

      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [updateStatus]);

  const currentTrack = TRACKS[currentTrackIndex];

  return (
    <div className="min-h-screen bg-[#050505] text-cyan-400 font-mono p-4 flex flex-col items-center justify-center relative overflow-hidden">
      <div className="scanlines" />
      <div className="static-noise" />
      
      <audio ref={audioRef} src={currentTrack.url} onEnded={nextTrack} />

      <div className="z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Audio Subsystem */}
        <div className="lg:col-span-4 border-2 border-magenta-500 p-6 bg-black/80 relative shadow-[0_0_30px_rgba(255,0,255,0.15)]">
          <div className="absolute top-0 left-0 bg-magenta-500 text-black px-2 py-1 text-xs font-bold uppercase tracking-widest">SYS.AUDIO_LINK</div>
          
          <div className="mt-4 flex flex-col gap-6">
            <div className="text-center mb-2">
              <h2 className="text-3xl font-bold glitch" data-text="AUDIO_LINK">AUDIO_LINK</h2>
              <p className="text-sm text-magenta-500 mt-1 animate-pulse">STATUS: {isPlaying ? 'STREAMING' : 'STANDBY'}</p>
            </div>

            <div className="relative border-2 border-cyan-500 p-1 bg-black">
              <div className="absolute top-0 left-0 w-full h-full bg-cyan-500/10 animate-pulse pointer-events-none" />
              <div className="aspect-square bg-neutral-900 flex items-center justify-center overflow-hidden relative">
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                  <Terminal size={120} className="text-cyan-500" />
                </div>
                <div className="z-10 text-center p-4">
                  <p className="text-xl text-cyan-400 mb-2 glitch" data-text={currentTrack.title}>{currentTrack.title}</p>
                  <p className="text-magenta-500">{currentTrack.artist}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border border-cyan-900 p-2 bg-black">
              <button onClick={prevTrack} className="p-2 hover:bg-cyan-900 text-cyan-500 transition-colors">
                <SkipBack size={24} />
              </button>
              <button onClick={togglePlay} className="p-3 bg-cyan-500 text-black hover:bg-magenta-500 transition-colors">
                {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
              </button>
              <button onClick={nextTrack} className="p-2 hover:bg-cyan-900 text-cyan-500 transition-colors">
                <SkipForward size={24} />
              </button>
            </div>

            <div className="flex items-center gap-3 border border-cyan-900 p-2 bg-black">
              <button onClick={() => setIsMuted(!isMuted)} className="text-cyan-500 hover:text-magenta-500">
                {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  setIsMuted(false);
                }}
                className="w-full h-2 bg-cyan-900 appearance-none cursor-pointer accent-magenta-500"
              />
            </div>
          </div>
        </div>

        {/* Right: Main Terminal (Game) */}
        <div className="lg:col-span-8 border-2 border-cyan-500 p-6 bg-black/80 relative flex flex-col items-center shadow-[0_0_30px_rgba(0,255,255,0.15)]">
          <div className="absolute top-0 left-0 bg-cyan-500 text-black px-2 py-1 text-xs font-bold uppercase tracking-widest">SYS.ASSIMILATE_BIOMASS</div>
          
          <div className="w-full max-w-[400px] flex justify-between mb-4 text-sm mt-4 uppercase tracking-widest">
            <div>DATA_ACQUIRED: <span className="text-magenta-500 text-xl">{score}</span></div>
            <div>STATUS: <span className={uiStatus === 'GAME_OVER' ? 'text-red-500 glitch' : 'text-cyan-500'} data-text={uiStatus}>{uiStatus}</span></div>
          </div>

          <div className="relative">
            <canvas 
              ref={canvasRef} 
              width={CANVAS_SIZE} 
              height={CANVAS_SIZE} 
              className="border border-cyan-900 shadow-[0_0_30px_rgba(0,255,255,0.2)] w-full max-w-[400px] aspect-square bg-[#050505]"
            />
            
            {uiStatus === 'IDLE' && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center border border-cyan-500/50">
                <h2 className="text-4xl glitch mb-4 text-cyan-500" data-text="AWAITING_INPUT">AWAITING_INPUT</h2>
                <p className="animate-pulse text-magenta-500 text-lg">PRESS [SPACE] TO EXECUTE</p>
              </div>
            )}
            
            {uiStatus === 'GAME_OVER' && (
              <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center border border-magenta-500/50">
                <h2 className="text-5xl glitch text-magenta-500 mb-4" data-text="SYSTEM_FAILURE">SYSTEM_FAILURE</h2>
                <p className="mb-6 text-cyan-500 text-xl">BIOMASS_LOST // FINAL_DATA: {score}</p>
                <p className="animate-pulse text-white text-lg bg-magenta-500/20 px-4 py-2 border border-magenta-500">PRESS [SPACE] TO REBOOT</p>
              </div>
            )}
          </div>
          
          <div className="mt-6 text-center text-cyan-900 text-xs uppercase tracking-widest">
            <p>USE [W][A][S][D] OR [ARROWS] TO NAVIGATE</p>
            <p className="mt-1">MAINTAIN BIOMASS INTEGRITY</p>
          </div>
        </div>

      </div>
    </div>
  );
}

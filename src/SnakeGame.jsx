import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Button, Typography, Paper, Grid, keyframes } from '@mui/material';
import { PlayArrow, Replay, Pause} from '@mui/icons-material';

// Game constants
const GRID_SIZE = 25;
const CELL_SIZE = 30;
const INITIAL_SPEED = 150;
const MAX_SPEED = 50;

const DIRECTIONS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 }
};

// Keyframes for animations
const pulse = keyframes`
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.05); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.8; }
`;

const rainbow = keyframes`
  0% { filter: hue-rotate(0deg); }
  100% { filter: hue-rotate(360deg); }
`;

const wobble = keyframes`
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(5deg); }
  75% { transform: rotate(-5deg); }
`;

const SnakeGame = () => {
  // Game state
  const [snake, setSnake] = useState([{ x: 12, y: 12 }]);
  const [food, setFood] = useState({ x: 5, y: 5, type: 'normal' });
  const [direction, setDirection] = useState(DIRECTIONS.RIGHT);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [mouthOpen, setMouthOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [theme, setTheme] = useState('default');
  const [particles, setParticles] = useState([]);
  
  const directionRef = useRef(direction);
  const requestRef = useRef();
  const previousTimeRef = useRef();

  // Define FOOD_TYPES inside the component to make it available to hooks
  const FOOD_TYPES = useRef({
    normal: { color: '#FF5722', score: 10, effect: null },      // Orange
    bonus: { color: '#FFEB3B', score: 30, effect: 'speedUp' },  // Yellow
    super: { color: '#9C27B0', score: 50, effect: 'rainbow' },  // Purple
    slow: { color: '#2196F3', score: 20, effect: 'slowDown' }   // Blue
  }).current;

  // Generate random food with different types
  const generateFood = useCallback(() => {
    const randomType = Math.random() > 0.8 ? 
      (Math.random() > 0.5 ? 'bonus' : 'super') : 
      (Math.random() > 0.7 ? 'slow' : 'normal');
    
    const newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
      type: randomType
    };

    // Make sure food doesn't appear on snake
    const isOnSnake = snake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
    if (isOnSnake) return generateFood();

    return newFood;
  }, [snake]);

  // Add visual particles
  const addParticles = (x, y, color, count = 5) => {
    const newParticles = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        x: x * CELL_SIZE + CELL_SIZE / 2,
        y: y * CELL_SIZE + CELL_SIZE / 2,
        color,
        size: Math.random() * 4 + 2,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 30 + Math.random() * 20
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  };

  // Reset game state
  const resetGame = useCallback(() => {
    setSnake([{ x: 12, y: 12 }]);
    setFood(generateFood());
    setDirection(DIRECTIONS.RIGHT);
    directionRef.current = DIRECTIONS.RIGHT;
    setGameOver(false);
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setMouthOpen(false);
    setIsPlaying(true);
    setIsPaused(false);
    setTheme('default');
    setParticles([]);
  }, [generateFood]);

  // Check collisions
  const isOutOfBounds = (position) => {
    return (
      position.x < 0 ||
      position.x >= GRID_SIZE ||
      position.y < 0 ||
      position.y >= GRID_SIZE
    );
  };

  const checkSelfCollision = useCallback((head) => {
    return snake.some((segment, index) => {
      if (index === 0) return false;
      return segment.x === head.x && segment.y === head.y;
    });
  }, [snake]);

  // Game loop
  const gameLoop = useCallback((timestamp) => {
    if (previousTimeRef.current === undefined) {
      previousTimeRef.current = timestamp;
    }

    const elapsed = timestamp - previousTimeRef.current;

    if (elapsed > speed) {
      previousTimeRef.current = timestamp;

      if (!gameOver && isPlaying && !isPaused) {
        setSnake(prevSnake => {
          const head = { ...prevSnake[0] };
          const currentDirection = directionRef.current;

          // Move head
          head.x += currentDirection.x;
          head.y += currentDirection.y;

          // Check for collisions
          if (isOutOfBounds(head) || checkSelfCollision(head)) {
            setGameOver(true);
            setIsPlaying(false);
            //if (!muted) new Audio('https://assets.mixkit.co/sfx/preview/mixkit-retro-arcade-lose-2027.mp3').play();
            return prevSnake;
          }

          const newSnake = [head, ...prevSnake];

          // Check if snake ate food
          if (head.x === food.x && head.y === food.y) {
          //  if (!muted) new Audio('https://assets.mixkit.co/sfx/preview/mixkit-arcade-game-jump-coin-216.mp3').play();
            
            const foodType = FOOD_TYPES[food.type];
            setScore(prev => {
              const newScore = prev + foodType.score;
              if (newScore > highScore) setHighScore(newScore);
              return newScore;
            });

            // Apply food effects
            if (foodType.effect === 'speedUp') {
              setSpeed(prev => Math.max(prev - 20, MAX_SPEED));
              addParticles(food.x, food.y, foodType.color, 10);
            } else if (foodType.effect === 'slowDown') {
              setSpeed(prev => Math.min(prev + 30, INITIAL_SPEED));
              addParticles(food.x, food.y, foodType.color, 10);
            } else if (foodType.effect === 'rainbow') {
              setTheme('rainbow');
              setTimeout(() => setTheme('default'), 3000);
              addParticles(food.x, food.y, foodType.color, 15);
            } else {
              addParticles(food.x, food.y, foodType.color);
            }

            // Generate new food
            setFood(generateFood());

            // Animate mouth
            setMouthOpen(true);
            setTimeout(() => setMouthOpen(false), 200);

            return newSnake;
          }

          // Remove tail if no food eaten
          newSnake.pop();
          return newSnake;
        });
      }
    }

    // Update particles
    setParticles(prev => 
      prev.map(p => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        life: p.life - 1
      })).filter(p => p.life > 0)
    );

    requestRef.current = requestAnimationFrame(gameLoop);
  }, [food, gameOver, isPlaying, isPaused, speed, generateFood, checkSelfCollision, highScore, FOOD_TYPES]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === ' ') {
        if (!isPlaying && !gameOver) {
          resetGame();
        } else {
          setIsPaused(prev => !prev);
        }
        return;
      }

      if (isPaused) return;

      switch (e.key) {
        case 'ArrowUp':
          if (directionRef.current !== DIRECTIONS.DOWN) {
            directionRef.current = DIRECTIONS.UP;
          }
          break;
        case 'ArrowDown':
          if (directionRef.current !== DIRECTIONS.UP) {
            directionRef.current = DIRECTIONS.DOWN;
          }
          break;
        case 'ArrowLeft':
          if (directionRef.current !== DIRECTIONS.RIGHT) {
            directionRef.current = DIRECTIONS.LEFT;
          }
          break;
        case 'ArrowRight':
          if (directionRef.current !== DIRECTIONS.LEFT) {
            directionRef.current = DIRECTIONS.RIGHT;
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, gameOver, resetGame, isPaused]);

  // Start/stop game loop
  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [gameLoop]);

  // Render snake segment
  const renderSnakeSegment = (segment, index) => {
    const isHead = index === 0;
    const isTail = index === snake.length - 1;
    const segmentStyle = {
      width: CELL_SIZE,
      height: CELL_SIZE,
      background: isHead 
        ? theme === 'rainbow' 
          ? 'linear-gradient(45deg, #ff0000, #ff9900, #33cc33, #3399ff, #cc66ff)' 
          : 'radial-gradient(circle at 40% 40%, #66BB6A, #388E3C)'
        : theme === 'rainbow'
          ? `hsl(${(index * 10) % 360}, 80%, 60%)`
          : `hsl(${100 + (index * 2) % 60}, 70%, ${50 + (index % 20)}%)`,
      borderRadius: isHead 
        ? (mouthOpen ? '50% 50% 60% 60% / 40% 40% 60% 60%' : '50%')
        : isTail ? '45%' : '50%',
      position: 'absolute',
      left: segment.x * CELL_SIZE,
      top: segment.y * CELL_SIZE,
      zIndex: isHead ? 3 : 2,
      boxShadow: '0 0 5px rgba(0,0,0,0.3)',
      transition: 'all 0.1s ease',
      transform: isTail ? 'scale(0.9)' : 'scale(1)',
    //  borderRadius: '50%',
      animation: theme === 'rainbow' ? `${rainbow} 2s linear infinite` : 'none'
    };

    const eyesStyle = {
      position: 'absolute',
      width: CELL_SIZE / 4,
      height: CELL_SIZE / 4,
      backgroundColor: 'white',
      borderRadius: '50%',
      zIndex: 4,
    };

    const pupilStyle = {
      position: 'absolute',
      width: CELL_SIZE / 8,
      height: CELL_SIZE / 8,
      backgroundColor: 'black',
      borderRadius: '50%',
    };

    const leftEye = {
      ...eyesStyle,
      left: CELL_SIZE / 6,
      top: CELL_SIZE / 6,
    };

    const rightEye = {
      ...eyesStyle,
      right: CELL_SIZE / 6,
      top: CELL_SIZE / 6,
    };

    return (
      <Box key={index} style={segmentStyle}>
        {isHead && (
          <>
            <Box style={leftEye}><Box style={pupilStyle} /></Box>
            <Box style={rightEye}><Box style={pupilStyle} /></Box>
          </>
        )}
      </Box>
    );
  };

  // Render food
  const renderFood = () => {
    const foodType = FOOD_TYPES[food.type];
    const foodStyle = {
      width: CELL_SIZE,
      height: CELL_SIZE,
      backgroundColor: foodType.color,
      borderRadius: food.type === 'normal' ? '50%' : '30%',
      position: 'absolute',
      left: food.x * CELL_SIZE,
      top: food.y * CELL_SIZE,
      zIndex: 1,
      boxShadow: `0 0 10px ${foodType.color}`,
      animation: `${pulse} 0.5s infinite alternate`,
      transform: food.type === 'super' ? 'rotate(45deg)' : 'none',
      border: food.type === 'bonus' ? '2px dashed white' : 'none'
    };

    return <Box style={foodStyle} />;
  };

  // Render particles
  const renderParticles = () => {
    return particles.map((particle, index) => (
      <Box
        key={index}
        style={{
          position: 'absolute',
          left: particle.x,
          top: particle.y,
          width: particle.size,
          height: particle.size,
          backgroundColor: particle.color,
          borderRadius: '50%',
          opacity: particle.life / 50,
          zIndex: 4
        }}
      />
    ));
  };

  // To make the snake body circular, change the borderRadius in renderSnakeSegment:
  // Find this line inside renderSnakeSegment:
  // borderRadius: isHead 
  //   ? (mouthOpen ? '50% 50% 60% 60% / 40% 40% 60% 60%' : '30%')
  //   : isTail ? '20%' : '25%',
  // Change it to:
  // borderRadius: '50%',

  // The snake body is rendered here:
  // {snake.map((segment, index) => renderSnakeSegment(segment, index))}
  // This line maps over the snake array and renders each segment (including the head and tail).
  // The renderSnakeSegment function handles the appearance of each segment.

  // To make the snake body circular, change the borderRadius in renderSnakeSegment:
  // Find this line inside renderSnakeSegment:
  // borderRadius: isHead 
  //   ? (mouthOpen ? '50% 50% 60% 60% / 40% 40% 60% 60%' : '30%')
  //   : isTail ? '20%' : '25%',
  // Change it to:
  // borderRadius: '50%',

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d)',
      padding: 0,
      overflow: 'hidden',
    }}>
      <Typography variant="h3" gutterBottom sx={{ 
        fontFamily: '"Bungee", cursive', 
        color: 'white',
        textShadow: '3px 3px 0 #000',
        animation: `${wobble} 2s infinite`,
        mb: 2
      }}>
        NEO SNAKE
      </Typography>

      <Box sx={{ 
        mb: 2, 
        display: 'flex', 
        alignItems: 'center', 
        gap: 3,
        background: 'rgba(0,0,0,0.3)',
        padding: 2,
        borderRadius: 2,
        width: '100%',
        maxWidth: GRID_SIZE * CELL_SIZE
      }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
            Score: <span style={{ color: '#FFEB3B' }}>{score}</span>
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
            High Score: {highScore}
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          color="secondary"
          startIcon={gameOver ? <Replay /> : isPlaying ? <Pause /> : <PlayArrow />}
          onClick={gameOver ? resetGame : () => setIsPlaying(prev => !prev)}
          sx={{ fontWeight: 'bold', mr: 1 }}
        >
          {gameOver ? 'Play Again' : isPlaying ? 'Pause' : 'Start'}
        </Button>
        
        
      </Box>

      <Paper elevation={10} sx={{ 
        position: 'relative', 
        overflow: 'hidden',
        borderRadius: 4,
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
      }}>
        <Box sx={{
          width: GRID_SIZE * CELL_SIZE,
          height: GRID_SIZE * CELL_SIZE,
          backgroundColor: '#121212',
          position: 'relative',
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
        }}>
          {renderFood()}
          {/* Snake body is rendered below */}
          {snake.map((segment, index) => renderSnakeSegment(segment, index))}
          {renderParticles()}

          {gameOver && (
            <Box sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.85)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}>
              <Typography variant="h3" sx={{ 
                color: '#FF5252', 
                fontFamily: '"Bungee", cursive',
                textShadow: '2px 2px 0 #000',
                mb: 1
              }}>
                GAME OVER!
              </Typography>
              <Typography variant="h5" sx={{ 
                color: 'white', 
                mb: 3,
                fontFamily: '"Press Start 2P", cursive'
              }}>
                Score: <span style={{ color: '#4CAF50' }}>{score}</span>
              </Typography>
              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={<Replay />}
                onClick={resetGame}
                sx={{ 
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  py: 1.5,
                  px: 3
                }}
              >
                Play Again
              </Button>
            </Box>
          )}

          {!isPlaying && !gameOver && (
            <Box sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}>
              <Typography variant="h4" sx={{ 
                color: 'white', 
                mb: 3,
                fontFamily: '"Bungee", cursive',
                textShadow: '2px 2px 0 #000'
              }}>
                READY TO PLAY?
              </Typography>
              <Grid container spacing={2} sx={{ maxWidth: 400, mb: 3 }}>
                <Grid item xs={12}>
                  <Typography variant="body1" sx={{ 
                    color: 'white', 
                    textAlign: 'center',
                    fontFamily: '"Press Start 2P", cursive',
                    fontSize: '0.7rem'
                  }}>
                    Use arrow keys to control the snake
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body1" sx={{ 
                    color: 'white', 
                    textAlign: 'center',
                    fontFamily: '"Press Start 2P", cursive',
                    fontSize: '0.7rem'
                  }}>
                    Eat different foods for special effects
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body1" sx={{ 
                    color: 'white', 
                    textAlign: 'center',
                    fontFamily: '"Press Start 2P", cursive',
                    fontSize: '0.7rem'
                  }}>
                    Press SPACE to pause/resume
                  </Typography>
                </Grid>
              </Grid>
              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={<PlayArrow />}
                onClick={resetGame}
                sx={{ 
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  py: 1.5,
                  px: 4
                }}
              >
                START GAME
              </Button>
            </Box>
          )}

          {isPaused && (
            <Box sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}>
              <Typography variant="h4" sx={{ 
                color: 'white', 
                fontFamily: '"Bungee", cursive',
                textShadow: '2px 2px 0 #000'
              }}>
                PAUSED
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ 
          color: 'rgba(255,255,255,0.8)',
          fontFamily: '"Press Start 2P", cursive',
          fontSize: '0.6rem'
        }}>
          YELLOW = SPEED BOOST | PURPLE = RAINBOW MODE | BLUE = SLOW DOWN
        </Typography>
      </Box>
    </Box>
  );
};

export default SnakeGame;
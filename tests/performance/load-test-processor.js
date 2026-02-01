/**
 * Artillery load test processor
 * Generates random player data and movement patterns
 */

module.exports = {
  generatePlayerData: generatePlayerData,
  generateMovementInput: generateMovementInput,
};

function generatePlayerData(userContext, events, done) {
  const shapes = ['circle', 'square', 'triangle', 'hexagon'];
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];

  userContext.vars.name = `Player_${Math.floor(Math.random() * 10000)}`;
  userContext.vars.shape = shapes[Math.floor(Math.random() * shapes.length)];
  userContext.vars.color = colors[Math.floor(Math.random() * colors.length)];
  userContext.vars.positionX = (Math.random() - 0.5) * 2000;
  userContext.vars.positionY = (Math.random() - 0.5) * 2000;

  return done();
}

function generateMovementInput(userContext, events, done) {
  // Generate movement in a circle or random direction
  const pattern = Math.random() > 0.5 ? 'circle' : 'random';
  const time = Date.now() / 1000;

  if (pattern === 'circle') {
    const radius = 500;
    userContext.vars.targetX = Math.cos(time) * radius;
    userContext.vars.targetY = Math.sin(time) * radius;
  } else {
    // Random walk
    const currentX = userContext.vars.positionX || 0;
    const currentY = userContext.vars.positionY || 0;
    userContext.vars.targetX = currentX + (Math.random() - 0.5) * 200;
    userContext.vars.targetY = currentY + (Math.random() - 0.5) * 200;
    userContext.vars.positionX = userContext.vars.targetX;
    userContext.vars.positionY = userContext.vars.targetY;
  }

  // Random skill usage
  userContext.vars.space = Math.random() > 0.9;
  userContext.vars.w = Math.random() > 0.95;
  userContext.vars.seq = (userContext.vars.seq || 0) + 1;

  return done();
}

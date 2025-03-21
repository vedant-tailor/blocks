varying vec2 vUv;
uniform float time;
uniform vec2 uMouse;
uniform float uHover;
uniform float uMoving; // Mouse movement strength
uniform sampler2D uTexture;
uniform float uBlockCount;
uniform float uDistortionIntensity;
uniform float uDistanceMultiplier;
uniform float uAnimationSpeed;

void main() {
    float blocks = uBlockCount > 0.0 ? uBlockCount : 20.0;  // Use parameter or fallback to 20
    vec2 blockUv = floor(vUv * blocks) / blocks;  // Creates the block pattern
    float distance = length(blockUv - uMouse);  // Calculates distance from mouse
    float effect = smoothstep(uDistanceMultiplier > 0.0 ? uDistanceMultiplier : 0.4, 0.0, distance);  // Creates smooth transition effect
    
    // Get distortion amount - only when mouse is moving (uMoving > 0)
    float distortionAmount = uDistortionIntensity > 0.0 ? uDistortionIntensity : 0.05;
    vec2 distortion = vec2(distortionAmount) * effect * uHover * uMoving;
    
    // Apply animation only when mouse is moving
    vec2 animatedUv = vUv;
    if (uMoving > 0.0) {
        animatedUv = vUv + distortion;
    }

    // Sample texture with either static or animated UVs
    vec4 textureColor = texture2D(uTexture, animatedUv);
    
    gl_FragColor = textureColor;
} 
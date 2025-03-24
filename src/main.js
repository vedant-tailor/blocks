import './styles.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import vertexShader from './shaders/vertex.glsl'
import fragmentShader from './shaders/fragment.glsl'
import LocomotiveScroll from 'locomotive-scroll'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
// SplitText is a premium GSAP plugin, so we won't use it

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger)

// Create the scene
const scene = new THREE.Scene()

// Initialize locomotive scroll with optimized settings
const scroll = new LocomotiveScroll({
  el: document.querySelector('[data-scroll-container]'),
  smooth: true,
  multiplier: 1,
  lerp: 0.1, // Slightly increased for smoother transitions
  smartphone: {
    smooth: true,
    multiplier: 0.8 // Reduced multiplier for mobile for better performance
  },
  tablet: {
    smooth: true,
    multiplier: 0.9
  },
  reloadOnContextChange: true,
  inertia: 0.6 // Added inertia for more natural feeling
})

// Better ScrollTrigger integration with Locomotive Scroll
ScrollTrigger.scrollerProxy("[data-scroll-container]", {
  scrollTop(value) {
    return arguments.length 
      ? scroll.scrollTo(value, { duration: 0, disableLerp: true })
      : scroll.scroll.instance.scroll.y;
  },
  getBoundingClientRect() {
    return {
      top: 0, 
      left: 0, 
      width: window.innerWidth, 
      height: window.innerHeight
    };
  },
  pinType: document.querySelector("[data-scroll-container]").style.transform ? "transform" : "fixed"
});

// Each time the window updates, we should refresh ScrollTrigger and then update LocomotiveScroll
ScrollTrigger.addEventListener("refresh", () => scroll.update());

// After everything is set up, refresh() ScrollTrigger and update LocomotiveScroll
ScrollTrigger.refresh();

// Handle resize events properly
window.addEventListener("resize", () => {
  // Delay the update for better performance
  setTimeout(() => {
    ScrollTrigger.refresh();
    scroll.update();
  }, 200);
});

// Set fixed values for animation parameters
const params = {
  blockCount: 100,
  distortionIntensity: 0.08,
  distanceMultiplier: 0.6,
  animationSpeed: 1.8,
  movementDecay: 0.97 // How quickly the movement effect fades
}

// Create the camera with calculated FOV
const distance = 400  // Reduced distance for better fit within viewport
const fov = 2 * Math.atan((window.innerHeight/2)/distance) * (180/Math.PI)
const camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.z = distance

// Create the renderer for the hero section
const canvas = document.getElementById('three-canvas')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
renderer.setSize(canvas.clientWidth, canvas.clientHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// Optional controls, might want to disable for production
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enabled = false // Disable controls by default

// Create raycaster for mouse interactions
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
const prevMouse = new THREE.Vector2()
let moveStrength = 0

// Create array to store all planes
const planes = []
const images = document.querySelectorAll('.images-container img')

// Create planes for each image
images.forEach((img, index) => {
  // Wait for image to load before creating plane
  img.onload = () => {
    // Get image bounds - using canvas dimensions
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    
    // Load texture from image
    const texture = new THREE.TextureLoader().load(img.src)
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    
    // Create shader material
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        time: { value: 0 },
        uTexture: { value: texture },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uHover: { value: 0.0 },
        uMoving: { value: 0.0 }, // New uniform for mouse movement strength
        uLastPos: { value: new THREE.Vector2(0.5, 0.5) }, // Store last position for delayed animation
        uBlockCount: { value: params.blockCount },
        uDistortionIntensity: { value: params.distortionIntensity },
        uDistanceMultiplier: { value: params.distanceMultiplier },
        uAnimationSpeed: { value: params.animationSpeed },
        uScrollProgress: { value: 0.0 } // New uniform for scroll progress
      },
      side: THREE.DoubleSide
    })
    
    // Create plane geometry for fullscreen within hero section
    const geometry = new THREE.PlaneGeometry(width, height, 32, 32)
    
    // Create mesh and position it
    const plane = new THREE.Mesh(geometry, material)
    
    // Position the plane - stagger them slightly in z
    plane.position.z = -index * 50
    
    // Add to planes array and scene
    planes.push(plane)
    scene.add(plane)
  }
  
  // Trigger load if image is already loaded
  if (img.complete) {
    img.onload()
  }
})

// Only track mouse movement in the hero section
document.querySelector('section:first-child').addEventListener('mousemove', (event) => {
  // Calculate mouse movement
  const heroSection = event.currentTarget
  const rect = heroSection.getBoundingClientRect()
  
  // Calculate normalized coordinates within the hero section
  const x = (event.clientX - rect.left) / rect.width
  const y = (event.clientY - rect.top) / rect.height  // Remove the 1.0 - inversion
  
  const currentMouse = new THREE.Vector2(x, y)
  
  // Calculate movement distance
  const moveDist = Math.sqrt(
    Math.pow(currentMouse.x - prevMouse.x, 2) + 
    Math.pow(currentMouse.y - prevMouse.y, 2)
  )
  
  // Update movement strength
  moveStrength = Math.min(moveDist * 20, 1.0)
  
  // Store previous mouse position
  prevMouse.copy(currentMouse)
  
  // Convert mouse position to normalized device coordinates
  mouse.x = (x * 2) - 1
  mouse.y = -((y * 2) - 1)
  
  // Update raycaster
  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(planes)
  
  // Reset all planes' hover state
  planes.forEach(plane => {
    plane.material.uniforms.uMouse.value = new THREE.Vector2(0.5, 0.5)
    plane.material.uniforms.uHover.value = 0.0
  })
  
  // Update hover state for intersected plane
  if (intersects.length > 0) {
    const intersectedPlane = intersects[0]
    const uv = intersectedPlane.uv
    
    // Store last position for smooth transition
    intersectedPlane.object.material.uniforms.uLastPos.value.copy(uv)
    intersectedPlane.object.material.uniforms.uMouse.value.copy(uv)
    intersectedPlane.object.material.uniforms.uHover.value = 1.0
    intersectedPlane.object.material.uniforms.uMoving.value = moveStrength
  }
})

// Handle window resize with proper debouncing
let resizeTimeout;
const handleResize = () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    // Get hero section dimensions
    const heroSection = document.querySelector('section:first-child')
    const width = heroSection.clientWidth
    const height = heroSection.clientHeight
    
    // Recalculate FOV
    const newfov = 2 * Math.atan((height/2)/distance) * (180/Math.PI)
    camera.fov = newfov
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    
    // Update renderer size to match hero section
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    
    // Update plane positions
    updatePlanesPositions()
    
    // Update scroll-based animations
    ScrollTrigger.refresh();
    scroll.update();
  }, 200);
}

window.addEventListener('resize', handleResize)

// Function to update plane positions on resize
const updatePlanesPositions = () => {
  planes.forEach((plane) => {
    // Update plane dimensions to match canvas
    plane.geometry.dispose()
    plane.geometry = new THREE.PlaneGeometry(canvas.clientWidth, canvas.clientHeight, 32, 32)
  })
}

// GSAP Marquee Animation - optimized for Locomotive Scroll
const setupMarquee = () => {
  const marqueeContainers = document.querySelectorAll('.marquee-container')
  
  marqueeContainers.forEach((container, index) => {
    const wrappers = container.querySelectorAll('.marquee-wrapper')
    
    // Get the width of the first wrapper in this container
    const wrapperWidth = wrappers[0].offsetWidth
    
    // Set different speeds based on container index
    const duration = index === 0 ? 40 : 45 // First container faster, second slower
    const direction = index === 0 ? -1 : -1 // Direction: -1 for left, 1 for right
    
    // Set up GSAP animation with better ScrollTrigger integration
    gsap.to(wrappers, {
      x: direction * wrapperWidth,
      ease: 'none',
      repeat: -1, // Infinite repeat
      duration: duration,
      modifiers: {
        x: gsap.utils.unitize(x => parseFloat(x) % wrapperWidth) // Keep it wrapping
      },
      scrollTrigger: {
        trigger: container,
        start: 'top bottom',
        end: 'bottom top',
        scroller: "[data-scroll-container]",
        toggleActions: 'play pause resume pause'
      }
    })
  })
}

// Add headings animation
const setupHeadingsAnimation = () => {
  // Target all section headings
  const headings = document.querySelectorAll('h2[data-scroll]');
  
  headings.forEach(heading => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: heading,
        start: 'top 80%',
        end: 'bottom 20%',
        scroller: "[data-scroll-container]",
        toggleActions: 'play none none reverse'
      }
    });
    
    tl.from(heading, {
      y: 50,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out'
    });
  });
}

// Animation loop
const clock = new THREE.Clock()
const animate = () => {
  requestAnimationFrame(animate)
  
  // Update time uniform for all planes
  planes.forEach(plane => {
    plane.material.uniforms.time.value = clock.getElapsedTime() * params.animationSpeed
    
    // Apply movement decay
    const currentMoving = plane.material.uniforms.uMoving.value
    if (currentMoving > 0.01) {
      plane.material.uniforms.uMoving.value *= params.movementDecay
    } else {
      plane.material.uniforms.uMoving.value = 0
    }
    
    // Update scroll progress if available
    if (plane.material.uniforms.uScrollProgress) {
      const scrollTop = scroll.scroll.instance.scroll.y;
      const scrollMax = document.body.scrollHeight - window.innerHeight;
      const scrollProgress = Math.min(Math.max(scrollTop / scrollMax, 0), 1);
      plane.material.uniforms.uScrollProgress.value = scrollProgress;
    }
  })
  
  // Render scene
  renderer.render(scene, camera)
}

// Initialize everything once the DOM is fully loaded
window.addEventListener('DOMContentLoaded', () => {
  setupMarquee()
  setupHeadingsAnimation()
  handleResize()
  animate()
})

// Wait for document load then initialize
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    setupMarquee()
    setupHeadingsAnimation()
  })
} else {
  setupMarquee()
  setupHeadingsAnimation()
}

// Initialize
handleResize()
animate()

// Update positions on scroll with throttling for better performance
let lastScrollTime = 0;
scroll.on('scroll', (instance) => {
  const now = Date.now();
  if (now - lastScrollTime > 16) { // Limit to ~60fps
    // Update ScrollTrigger
    ScrollTrigger.update();
    
    // Update Three.js elements for smoother parallax
    const scrollY = instance.scroll.y;
    const heroSection = document.querySelector('section:first-child');
    const heroRect = heroSection.getBoundingClientRect();
    
    // Apply parallax to Three.js planes only when hero section is visible
    if (heroRect.bottom > 0 && heroRect.top < window.innerHeight) {
      planes.forEach((plane, index) => {
        // Subtle parallax effect on planes
        const parallaxFactor = 0.15 * (index + 1);
        plane.position.y = scrollY * parallaxFactor;
      });
    }
    
    lastScrollTime = now;
  }
});
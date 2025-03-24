import './styles.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import vertexShader from './shaders/vertex.glsl'
import fragmentShader from './shaders/fragment.glsl'
// import LocomotiveScroll from 'locomotive-scroll'
import gsap from 'gsap'

// Create the scene
const scene = new THREE.Scene()

// Initialize locomotive scroll
// const scroll = new LocomotiveScroll()

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
        uAnimationSpeed: { value: params.animationSpeed }
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

// Grid images with shader effect
const gridPlanes = []
const gridImages = document.querySelectorAll('.grid-image')

// Create renderer for grid items
const setupGridEffect = () => {
  gridImages.forEach((img, index) => {
    const container = img.parentElement
    
    // Create a new canvas for this grid item
    const canvas = document.createElement('canvas')
    canvas.classList.add('absolute', 'top-0', 'left-0', 'w-full', 'h-full')
    canvas.style.zIndex = '1'
    container.appendChild(canvas)
    
    // Hide the original image
    img.style.opacity = '0'
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ 
      canvas, 
      antialias: true, 
      alpha: true 
    })
    renderer.setSize(container.offsetWidth, container.offsetHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    
    // Create camera
    const camera = new THREE.PerspectiveCamera(45, container.offsetWidth / container.offsetHeight, 0.1, 1000)
    camera.position.z = 2
    
    // Load texture
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
        uMoving: { value: 0.0 },
        uLastPos: { value: new THREE.Vector2(0.5, 0.5) },
        uBlockCount: { value: params.blockCount },
        uDistortionIntensity: { value: params.distortionIntensity },
        uDistanceMultiplier: { value: params.distanceMultiplier },
        uAnimationSpeed: { value: params.animationSpeed }
      },
      side: THREE.DoubleSide
    })
    
    // Create plane
    const geometry = new THREE.PlaneGeometry(1.5, 1.5, 32, 32)
    const plane = new THREE.Mesh(geometry, material)
    
    // Create scene
    const scene = new THREE.Scene()
    scene.add(plane)
    
    // Add to gridPlanes array
    gridPlanes.push({
      container,
      renderer,
      scene,
      camera,
      plane,
      material
    })
    
    // Add mousemove event for this grid item
    container.addEventListener('mousemove', (event) => {
      const rect = container.getBoundingClientRect()
      const x = (event.clientX - rect.left) / rect.width
      const y = (event.clientY - rect.top) / rect.height  // Remove the 1.0 - inversion
      
      // Calculate movement distance
      const currentMouse = new THREE.Vector2(x, y)
      const prevMousePos = plane.userData.prevMouse || new THREE.Vector2(0.5, 0.5)
      
      const moveDist = Math.sqrt(
        Math.pow(currentMouse.x - prevMousePos.x, 2) + 
        Math.pow(currentMouse.y - prevMousePos.y, 2)
      )
      
      // Update movement strength
      const strength = Math.min(moveDist * 20, 1.0)
      
      // Update uniforms
      material.uniforms.uMouse.value.set(x, y)
      material.uniforms.uHover.value = 1.0
      material.uniforms.uMoving.value = strength
      
      // Store previous position
      plane.userData.prevMouse = currentMouse.clone()
    })
    
    // Add mouseleave event
    container.addEventListener('mouseleave', () => {
      material.uniforms.uHover.value = 0.0
    })
  })
}

// Function to update grid planes on resize
const updateGridPlanesPositions = () => {
  gridPlanes.forEach((item) => {
    item.renderer.setSize(item.container.offsetWidth, item.container.offsetHeight)
    item.camera.aspect = item.container.offsetWidth / item.container.offsetHeight
    item.camera.updateProjectionMatrix()
  })
}

// Function to update plane positions on resize
const updatePlanesPositions = () => {
  planes.forEach((plane) => {
    // Update plane dimensions to match canvas
    plane.geometry.dispose()
    plane.geometry = new THREE.PlaneGeometry(canvas.clientWidth, canvas.clientHeight, 32, 32)
  })
}

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

// Handle window resize
const handleResize = () => {
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
  
  // Update grid plane positions
  updateGridPlanesPositions()
}

window.addEventListener('resize', handleResize)

// GSAP Marquee Animation
const setupMarquee = () => {
  const marqueeContainers = document.querySelectorAll('.marquee-container')
  
  marqueeContainers.forEach((container, index) => {
    const wrappers = container.querySelectorAll('.marquee-wrapper')
    
    // Get the width of the first wrapper in this container
    const wrapperWidth = wrappers[0].offsetWidth
    
    // Set different speeds based on container index
    const duration = index === 0 ? 40 : 45 // First container faster, second slower
    const direction = index === 0 ? -1 : -1 // Direction: -1 for left, 1 for right
    
    // Set up GSAP animation
    gsap.to(wrappers, {
      x: direction * wrapperWidth,
      ease: 'none',
      repeat: -1, // Infinite repeat
      duration: duration,
      modifiers: {
        x: gsap.utils.unitize(x => parseFloat(x) % wrapperWidth) // Keep it wrapping
      }
    })
  })
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
  })
  
  // Update and render grid planes
  gridPlanes.forEach(item => {
    const currentMaterial = item.material
    
    // Update time
    currentMaterial.uniforms.time.value = clock.getElapsedTime() * params.animationSpeed
    
    // Apply movement decay
    const currentMoving = currentMaterial.uniforms.uMoving.value
    if (currentMoving > 0.01) {
      currentMaterial.uniforms.uMoving.value *= params.movementDecay
    } else {
      currentMaterial.uniforms.uMoving.value = 0
    }
    
    // Render this grid item
    item.renderer.render(item.scene, item.camera)
  })
  
  // Render scene
  renderer.render(scene, camera)
}

// Initialize everything once the DOM is fully loaded
window.addEventListener('DOMContentLoaded', () => {
  setupGridEffect()
  setupMarquee()
  handleResize()
  animate()
})

// Wait for document load then initialize
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    setupGridEffect()
    setupMarquee()
  })
} else {
  setupGridEffect()
  setupMarquee()
}

// Initialize
handleResize()
animate()

// Update plane positions on scroll
// scroll.on('scroll', updatePlanesPositions)
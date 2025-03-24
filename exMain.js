import './styles.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GUI } from 'lil-gui'
import vertexShader from './shaders/vertex.glsl'
import fragmentShader from './shaders/fragment.glsl'
// import LocomotiveScroll from 'locomotive-scroll'

// Create the scene
const scene = new THREE.Scene()

// Initialize locomotive scroll
// const scroll = new LocomotiveScroll()

// Create GUI
const gui = new GUI()
const params = {
  blockCount: 20,
  distortionIntensity: 0.05,
  distanceMultiplier: 0.4,
  animationSpeed: 1.0,
  movementDecay: 0.95 // How quickly the movement effect fades
}

// Create the camera with calculated FOV
const distance = 600
const fov = 2 * Math.atan((window.innerHeight/2)/distance) * (180/Math.PI)
const camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.z = distance

// Create the renderer
const canvas = document.getElementById('three-canvas')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
// Don't append canvas as we're already referencing the existing one
// document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// Create raycaster for mouse interactions
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
const prevMouse = new THREE.Vector2()
let isMoving = false
let moveStrength = 0

// Create array to store all planes
const planes = []
const images = document.querySelectorAll('.images-container img')

// Create planes for each image
images.forEach((img, index) => {
  // Wait for image to load before creating plane
  img.onload = () => {
    // Get image bounds - using window dimensions for fullscreen effect
    const width = window.innerWidth
    const height = window.innerHeight
    
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
        uBlockCount: { value: params.blockCount },
        uDistortionIntensity: { value: params.distortionIntensity },
        uDistanceMultiplier: { value: params.distanceMultiplier },
        uAnimationSpeed: { value: params.animationSpeed }
      },
      side: THREE.DoubleSide
    })
    
    // Create plane geometry for fullscreen
    const geometry = new THREE.PlaneGeometry(width, height, 32, 32)
    
    // Create mesh and position it
    const plane = new THREE.Mesh(geometry, material)
    
    // Position the plane - stagger them slightly in z
    plane.position.z = -index * 50
    
    // Add to planes array and scene
    planes.push(plane)
    scene.add(plane)
    
    // If this is the first plane, add GUI controls
    if (index === 0) {
      setupGUI()
    }
  }
  
  // Trigger load if image is already loaded
  if (img.complete) {
    img.onload()
  }
})

// Setup GUI controls
function setupGUI() {
  const effectFolder = gui.addFolder('Effect Settings')
  
  effectFolder.add(params, 'blockCount', 5, 50, 1).onChange((value) => {
    planes.forEach(plane => {
      plane.material.uniforms.uBlockCount.value = value
    })
  })
  
  effectFolder.add(params, 'distortionIntensity', 0.01, 0.2, 0.01).onChange((value) => {
    planes.forEach(plane => {
      plane.material.uniforms.uDistortionIntensity.value = value
    })
  })
  
  effectFolder.add(params, 'distanceMultiplier', 0.1, 1.0, 0.05).onChange((value) => {
    planes.forEach(plane => {
      plane.material.uniforms.uDistanceMultiplier.value = value
    })
  })
  
  effectFolder.add(params, 'animationSpeed', 0.1, 5.0, 0.1).onChange((value) => {
    planes.forEach(plane => {
      plane.material.uniforms.uAnimationSpeed.value = value
    })
  })
  
  effectFolder.add(params, 'movementDecay', 0.8, 0.99, 0.01).name('Movement Fade')
  
  effectFolder.open()
}

// Function to update plane positions on resize
const updatePlanesPositions = () => {
  planes.forEach((plane) => {
    // Update plane dimensions
    plane.geometry.dispose()
    plane.geometry = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight, 32, 32)
  })
}

// Handle mouse movement
window.addEventListener('mousemove', (event) => {
  // Calculate mouse movement
  const currentMouse = new THREE.Vector2(
    event.clientX / window.innerWidth,
    1.0 - (event.clientY / window.innerHeight)
  )
  
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
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
  
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
    intersectedPlane.object.material.uniforms.uMouse.value = intersectedPlane.uv
    intersectedPlane.object.material.uniforms.uHover.value = 1.0
    intersectedPlane.object.material.uniforms.uMoving.value = moveStrength
  }
})

// Handle window resize
const handleResize = () => {
  // Recalculate FOV
  const newfov = 2 * Math.atan((window.innerHeight/2)/distance) * (180/Math.PI)
  camera.fov = newfov
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  
  // Update renderer
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  
  // Update plane positions
  updatePlanesPositions()
}

window.addEventListener('resize', handleResize)

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
  
  // Render scene
  renderer.render(scene, camera)
}

// Initialize
handleResize()
animate()

// Update plane positions on scroll
// scroll.on('scroll', updatePlanesPositions)
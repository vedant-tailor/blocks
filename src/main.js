import './styles.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import vertexShader from './shaders/vertex.glsl'
import fragmentShader from './shaders/fragment.glsl'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger)

gsap.config({ force3D: false }); 

// Create the scene
const scene = new THREE.Scene()

// Set fixed values for animation parameters
const params = {
  blockCount: 100,
  distortionIntensity: 0.08,
  distanceMultiplier: 0.6,
  animationSpeed: 1.8,
  movementDecay: 0.97
}

// Create the camera with calculated FOV
const distance = 400
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
        uMoving: { value: 0.0 },
        uLastPos: { value: new THREE.Vector2(0.5, 0.5) },
        uBlockCount: { value: params.blockCount },
        uDistortionIntensity: { value: params.distortionIntensity },
        uDistanceMultiplier: { value: params.distanceMultiplier },
        uAnimationSpeed: { value: params.animationSpeed },
        uScrollProgress: { value: 0.0 }
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
  const y = (event.clientY - rect.top) / rect.height
  
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
      repeat: -1,
      duration: duration,
      modifiers: {
        x: gsap.utils.unitize(x => parseFloat(x) % wrapperWidth)
      },
      scrollTrigger: {
        trigger: container,
        start: 'top bottom',
        end: 'bottom top',
        toggleActions: 'play pause resume pause'
      }
    })
  })
}

// Add headings animation
const setupHeadingsAnimation = () => {
  const headings = document.querySelectorAll('h2[data-scroll]');
  
  headings.forEach(heading => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: heading,
        start: 'top 80%',
        end: 'bottom 20%',
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

// Setup About Section Animation
const setupAboutSectionAnimation = () => {
  const aboutSection = document.querySelector('section:has(.text-blue-500)');
  if (!aboutSection) return;
  
  // Animate welcome pill
  const welcomePill = aboutSection.querySelector('.rounded-full');
  gsap.from(welcomePill, {
    y: -30,
    opacity: 0,
    duration: 0.8,
    ease: 'back.out(1.7)',
    scrollTrigger: {
      trigger: aboutSection,
      start: 'top 80%',
      toggleActions: 'play none none reverse'
    }
  });
  
  // Animate heading parts separately
  const headingParts = aboutSection.querySelectorAll('h2 span');
  gsap.from(headingParts, {
    y: 80,
    opacity: 0,
    duration: 1,
    stagger: 0.2,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: aboutSection,
      start: 'top 70%',
      toggleActions: 'play none none reverse'
    }
  });
  
  // Animate divider line
  const divider = aboutSection.querySelector('.w-24.h-1');
  gsap.from(divider, {
    width: 0,
    opacity: 0,
    duration: 1.2,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: aboutSection,
      start: 'top 60%',
      toggleActions: 'play none none reverse'
    }
  });
  
  // Animate description text
  const description = aboutSection.querySelector('p:not(.text-gray-400)');
  gsap.from(description, {
    y: 50,
    opacity: 0,
    duration: 1,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: aboutSection,
      start: 'top 50%',
      toggleActions: 'play none none reverse'
    }
  });
  
  // Animate feature cards
  const featureCards = aboutSection.querySelectorAll('.grid > div');
  gsap.from(featureCards, {
    y: 100,
    opacity: 0,
    duration: 0.8,
    stagger: 0.15,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.grid',
      start: 'top 80%',
      toggleActions: 'play none none reverse'
    }
  });
  
  // Animate decorative elements
  const blurCircles = aboutSection.querySelectorAll('.rounded-full.bg-blue-600, .rounded-full.bg-blue-500');
  gsap.from(blurCircles, {
    scale: 0.5,
    opacity: 0,
    duration: 1.5,
    stagger: 0.3,
    ease: 'power2.inOut',
    scrollTrigger: {
      trigger: aboutSection,
      start: 'top 80%',
      toggleActions: 'play none none reverse'
    }
  });
  
  // Add hover animations for feature cards
  featureCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      gsap.to(card, {
        y: -10,
        duration: 0.3,
        ease: 'power2.out'
      });
    });
    
    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        y: 0,
        duration: 0.5,
        ease: 'power2.out'
      });
    });
  });
}

// Setup VT image zoom on scroll
const setupVTZoomEffect = () => {
  const vtSection = document.querySelector('.vtsection'); // Select by Tailwind class
  const vtImage = document.getElementById('vt-zoom-svg');
  
  if (!vtSection || !vtImage) {
    console.log('VT elements not found, attempting alternative selectors');
    // Try alternative selector - the section containing VT image
    const altSection = document.querySelector('section:has(#vt-zoom-image)');
    if (altSection && vtImage) {
      setupVTZoom(altSection, vtImage);
      return;
    }
    return;
  }
  
  setupVTZoom(vtSection, vtImage);
}

// Helper function to setup the zoom effect
const setupVTZoom = (section, image) => {
  // Create a GSAP ScrollTrigger for the zoom effect
  gsap.fromTo(image, 
    { 
      scale: 1,
      opacity: 1
    }, 
    {
      scale: 8,
      opacity: 0.8,
      ease: "power2.out",
      scrollTrigger: {
        trigger: section,
        start: "top top", 
        end: "+=300%",
        scrub: 1,
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        fastScrollEnd: false,
        onUpdate: (self) => {
          // Add progressive blur effect to parent container
          const progress = self.progress;
          const blurAmount = progress * 10; // Max 10px blur
          image.parentElement.style.backdropFilter = `blur(${blurAmount}px)`;
        }
      }
    }
  );
  
  // Optional: Add slight rotation for more dynamic effect
  gsap.to(image, {
    rotation: 5,
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: "+=300%",
      scrub: 1.5,
    }
  });
  
  // Add slight y-axis movement for parallax effect
  gsap.to(image, {
    y: 50,
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: "+=300%",
      scrub: 2,
    }
  });
  
  // Create text reveal effect
  const textElement = document.createElement('div');
  textElement.className = 'absolute text-white text-4xl md:text-6xl font-bold opacity-0 z-20';
  textElement.textContent = 'Visual Experience';
  section.querySelector('.sticky').appendChild(textElement);
  
  gsap.fromTo(textElement, 
    { opacity: 0, y: 50 },
    { 
      opacity: 1, 
      y: 0, 
      scrollTrigger: {
        trigger: section,
        start: "top+=60% top",
        end: "+=50%",
        scrub: true
      }
    }
  );
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
    
    // Update scroll progress
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollMax = document.documentElement.scrollHeight - window.innerHeight;
    const scrollProgress = Math.min(Math.max(scrollTop / scrollMax, 0), 1);
    plane.material.uniforms.uScrollProgress.value = scrollProgress;
  })
  
  // Render scene
  renderer.render(scene, camera)
}

// Initialize everything once the DOM is fully loaded
window.addEventListener('DOMContentLoaded', () => {
  setupMarquee()
  setupHeadingsAnimation()
  setupVTZoomEffect()
  setupAboutSectionAnimation()
  handleResize()
  animate()
})

// Update positions on scroll with throttling for better performance
let lastScrollTime = 0;
window.addEventListener('scroll', () => {
  const now = Date.now();
  if (now - lastScrollTime > 16) { // Limit to ~60fps
    // Update ScrollTrigger
    ScrollTrigger.update();
    
    // Update Three.js elements for smoother parallax
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
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

// Initialize
handleResize()
animate()
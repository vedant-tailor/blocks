import * as THREE from 'three';
import vertexShader from './shaders/vertexShader.glsl';
import fragmentShader from './shaders/fragmentShader.glsl';
import LocomotiveScroll from 'locomotive-scroll';
import { TextureLoader } from 'three';

// Create the scene
const scene = new THREE.Scene();

const scroll = new LocomotiveScroll()

// Create the camera
const distance = 600;
const fov = 2 * Math.atan((window.innerHeight/2)/distance) * (180/Math.PI);
const camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = distance;

// Create the renderer
const canvas = document.querySelector('canvas');
const renderer = new THREE.WebGLRenderer({ canvas ,
  alpha: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Create raycaster
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const planes = [];
const image = document.querySelectorAll('img');
image.forEach(img => {
  const imgBounds = img.getBoundingClientRect();
  const texture = new THREE.TextureLoader().load(img.src);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTexture: { 
        value: texture 
      },
      uMouse: {
        value: new THREE.Vector2(0.5,0.5)
      },
      uHover: {
        value: 0
      }
    },
    vertexShader,
    fragmentShader,
  });
  const geometry = new THREE.PlaneGeometry(imgBounds.width, imgBounds.height);
  const plane = new THREE.Mesh(geometry, material);
  plane.position.set(
    imgBounds.left - window.innerWidth/2 + imgBounds.width/2 ,
    -imgBounds.top + window.innerHeight/2 - imgBounds.height/2,
    0
  );
  planes.push(plane);
  scene.add(plane);
});

const updatePlanesPositions = () => {
  planes.forEach((plane,index) => {
    const imgBounds = image[index].getBoundingClientRect();
    plane.position.set(
      imgBounds.left - window.innerWidth/2 + imgBounds.width/2 ,
      -imgBounds.top + window.innerHeight/2 - imgBounds.height/2,
      0
    );
  });
}

// Handle mouse movement
window.addEventListener('mousemove', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(planes);
  
  // Reset all planes' mouse uniforms
  planes.forEach(plane => {
    plane.material.uniforms.uMouse.value = new THREE.Vector2(0.5, 0.5);
    plane.material.uniforms.uHover.value = 0;
  });

  // Update mouse position for intersected plane
  if (intersects.length > 0) {
    const intersectedPlane = intersects[0];
    intersectedPlane.object.material.uniforms.uMouse.value = intersectedPlane.uv;
    intersectedPlane.object.material.uniforms.uHover.value = 1;
  }
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  updatePlanesPositions();
  renderer.render(scene, camera);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
  const newfov = 2 * Math.atan((window.innerHeight/2)/distance) * (180/Math.PI);
  camera.fov = newfov;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  updatePlanesPositions();
});

// scroll.on('scroll', updatePlanesPositions);
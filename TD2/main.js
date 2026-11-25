import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
const loader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();
const texture = loader.load( '../ressources/images/mur.jpg' );
const renderer = new THREE.WebGLRenderer();

scene.fog = new THREE.Fog( 0xFFFFFF, 10, 15 );
texture.colorSpace = THREE.SRGBColorSpace;
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate ); 
document.body.appendChild( renderer.domElement );
const color = 0xFFFFFF;
const intensity = 1;
const light = new THREE.AmbientLight(color, intensity);
scene.add(light);

const geometry = new THREE.BoxGeometry( 1, 1, 1 );
const material = new THREE.MeshBasicMaterial({
  color: 0xFF8844,
  map: texture,
});
const cube = new THREE.Mesh( geometry, material );

gltfLoader.load('../ressources/models/Earth.glb', (gltf) => {

  const earth = gltf.scene;
  earth.position.set(3, 0, 0);
  earth.scale.set(0.2, 0.2, 0);
  scene.add(earth);

}, undefined, (error) => {
  console.error(error);
});

scene.add( cube );

camera.position.z = 5;

function animate(time) {

  cube.rotation.x = time / 2000;
  cube.rotation.y = time / 1000;

  renderer.render(scene, camera);
}
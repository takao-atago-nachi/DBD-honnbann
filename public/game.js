const socket = io();
const roleEl = document.getElementById('role');
const attackHintEl = document.getElementById('attack-hint');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a10);
scene.fog = new THREE.FogExp2(0x0a0a10, 0.03);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0x222233, 1.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);

const grid = new THREE.GridHelper(50, 50, 0x444444, 0x222222);
scene.add(grid);

let myId = null;
let myRole = 'survivor';
const playerMeshes = {};
const keyState = {};

window.addEventListener('keydown', (e) => {
  keyState[e.code] = true;
  if (e.code === 'Space' && myRole === 'killer') socket.emit('attack');
});
window.addEventListener('keyup', (e) => { keyState[e.code] = false; });

function createPlayerMesh(role) {
  const group = new THREE.Group();
  let geometry = role === 'killer' ? new THREE.BoxGeometry(1.2, 2.2, 1.2) : new THREE.CylinderGeometry(0.5, 0.5, 1.6, 16);
  let material = new THREE.MeshStandardMaterial({ color: role === 'killer' ? 0xff2222 : 0x44ff44 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = role === 'killer' ? 1.1 : 0.8;
  group.add(mesh);
  return group;
}

socket.on('init', (data) => {
  myId = data.id;
  myRole = data.players[myId].role;
  roleEl.textContent = myRole === 'killer' ? 'キラー（鬼）' : 'サバイバー（逃げ手）';
  roleEl.className = myRole === 'killer' ? 'killer-text' : 'survivor-text';
  if (myRole === 'killer') attackHintEl.style.display = 'block';

  Object.values(data.players).forEach((p) => {
    const mesh = createPlayerMesh(p.role);
    mesh.position.set(p.x, 0, p.z);
    scene.add(mesh);
    playerMeshes[p.id] = mesh;
  });
});

socket.on('playerJoined', (p) => {
  const mesh = createPlayerMesh(p.role);
  mesh.position.set(p.x, 0, p.z);
  scene.add(mesh);
  playerMeshes[p.id] = mesh;
});

socket.on('playerMoved', (data) => {
  if (playerMeshes[data.id]) {
    playerMeshes[data.id].position.x = data.x;
    playerMeshes[data.id].position.z = data.z;
  }
});

socket.on('playerDowned', (data) => {
  if (playerMeshes[data.id]) playerMeshes[data.id].rotation.z = Math.PI / 2;
});

socket.on('playerLeft', (id) => {
  if (playerMeshes[id]) {
    scene.remove(playerMeshes[id]);
    delete playerMeshes[id];
  }
});

function animate() {
  requestAnimationFrame(animate);
  if (myId && playerMeshes[myId]) {
    const myMesh = playerMeshes[myId];
    const speed = myRole === 'killer' ? 0.15 : 0.11;
    let moved = false;

    if (keyState['KeyW'] || keyState['ArrowUp']) { myMesh.position.z -= speed; moved = true; }
    if (keyState['KeyS'] || keyState['ArrowDown']) { myMesh.position.z += speed; moved = true; }
    if (keyState['KeyA'] || keyState['ArrowLeft']) { myMesh.position.x -= speed; moved = true; }
    if (keyState['KeyD'] || keyState['ArrowRight']) { myMesh.position.x += speed; moved = true; }

    camera.position.set(myMesh.position.x, myMesh.position.y + 12, myMesh.position.z + 14);
    camera.lookAt(myMesh.position.x, myMesh.position.y, myMesh.position.z);

    if (moved) socket.emit('playerMove', { x: myMesh.position.x, z: myMesh.position.z });
  }
  renderer.render(scene, camera);
}
animate();
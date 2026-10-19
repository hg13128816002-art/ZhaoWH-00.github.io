// Keep the optional satellite engine in one lazy chunk, with only the exports it uses.
export {
  ACESFilmicToneMapping, Box3, CanvasTexture, DirectionalLight,
  EquirectangularReflectionMapping, Group, HemisphereLight, MathUtils,
  Object3D, PMREMGenerator, PerspectiveCamera, PointLight, Quaternion,
  SRGBColorSpace, Scene, Vector3, WebGLRenderer,
} from 'three';
export { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

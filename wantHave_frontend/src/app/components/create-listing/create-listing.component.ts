import { Component, inject, signal, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

import * as THREE from 'three';
import { EffectComposer, RenderPass, BloomEffect, EffectPass, ToneMappingEffect } from 'postprocessing';

import { AiService } from '../../services/ai.service';
import { CategoryService } from '../../services/category.service';
import { Category } from '../../interfaces/category';

@Component({
    selector: 'app-create-listing',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatSelectModule,
        MatSnackBarModule,
        MatProgressSpinnerModule,
        MatIconModule,
    ],
    templateUrl: './create-listing.component.html',
    styleUrl: './create-listing.component.scss',
})
export class CreateListingComponent implements AfterViewInit, OnDestroy {
    @ViewChild('spaceCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
    @ViewChild('cursorDot') cursorDotRef!: ElementRef<HTMLDivElement>;
    @ViewChild('cursorOutline') cursorOutlineRef!: ElementRef<HTMLDivElement>;

    // Dependency injection
    private http = inject(HttpClient);
    private router = inject(Router);
    private snackbar = inject(MatSnackBar);
    private aiService = inject(AiService);
    private categoryService = inject(CategoryService);

    // Three.js core
    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;
    private composer!: EffectComposer;
    private bloomEffect!: BloomEffect; // Store ref for intensity modulation
    private animationId!: number;
    private clock = new THREE.Clock();

    // Voxel Network
    private mesh!: THREE.InstancedMesh;
    private count = 800;
    private dummy = new THREE.Object3D();
    private color = new THREE.Color();

    // Line Network
    private linesMesh!: THREE.LineSegments;
    private linePositions!: Float32Array;
    private lineColors!: Float32Array;
    private maxConnections = 6000;

    // Data arrays
    private positions: Float32Array;
    private velocities: Float32Array;
    private originalPositions: Float32Array;
    private tunnelPositions: Float32Array; // Target positions for warp tunnel
    private shockwaveVelocities: Float32Array;

    // Hyperspace State
    private warpSpeed = 0;
    private fovBase = 60;

    // Interaction
    private mouse3D = new THREE.Vector3();
    private mouseX = 0;
    private mouseY = 0;
    private cursorX = 0;
    private cursorY = 0;
    private raycaster = new THREE.Raycaster();
    private plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    private clickPulse = 0;

    // Reactive state
    isAnalyzing = signal(false);
    previewMode = signal(false);
    selectedFile = signal<File | null>(null);
    imagePreviewUrl = signal<string | null>(null);
    categories = signal<Category[]>([]);

    // Form
    listingFormGroup = new FormGroup({
        title: new FormControl('', Validators.required),
        description: new FormControl('', Validators.required),
        category_id: new FormControl<number | null>(null),
        price: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    });

    priceMin = signal<number | null>(null);
    priceMax = signal<number | null>(null);

    constructor() {
        this.positions = new Float32Array(this.count * 3);
        this.velocities = new Float32Array(this.count * 3);
        this.originalPositions = new Float32Array(this.count * 3);
        this.tunnelPositions = new Float32Array(this.count * 3);
        this.shockwaveVelocities = new Float32Array(this.count * 3);

        this.categoryService.list().subscribe({
            next: (cats) => this.categories.set(cats),
            error: () => this.snackbar.open('Failed to load categories', 'OK', { duration: 3000 }),
        });
    }

    ngAfterViewInit(): void {
        this.initThreeJS();
        this.createVoxelNetwork();
        this.createConnections();
        this.setupPostProcessing();
        this.animate();
        window.addEventListener('resize', this.onWindowResize.bind(this));
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
        window.addEventListener('mousedown', this.onMouseDown.bind(this));
    }

    ngOnDestroy(): void {
        cancelAnimationFrame(this.animationId);
        window.removeEventListener('resize', this.onWindowResize.bind(this));
        window.removeEventListener('mousemove', this.onMouseMove.bind(this));
        window.removeEventListener('mousedown', this.onMouseDown.bind(this));
        this.renderer?.dispose();
        this.composer?.dispose();
    }

    private initThreeJS(): void {
        const canvas = this.canvasRef.nativeElement;
        const container = canvas.parentElement!;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x020205);
        this.scene.fog = new THREE.FogExp2(0x020205, 0.02);

        this.camera = new THREE.PerspectiveCamera(
            this.fovBase,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.z = 40;

        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: false,
            alpha: true,
            powerPreference: 'high-performance',
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    private createVoxelNetwork(): void {
        const geometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        const material = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            flatShading: true,
            shininess: 50,
        });

        const light1 = new THREE.DirectionalLight(0x00ffff, 1.5);
        light1.position.set(10, 10, 10);
        this.scene.add(light1);

        const light2 = new THREE.DirectionalLight(0xff00ff, 1.5);
        light2.position.set(-10, -10, 10);
        this.scene.add(light2);

        const ambient = new THREE.AmbientLight(0x222222);
        this.scene.add(ambient);

        this.mesh = new THREE.InstancedMesh(geometry, material, this.count);

        for (let i = 0; i < this.count; i++) {
            this.dummy.position.x = (Math.random() - 0.5) * 90;
            this.dummy.position.y = (Math.random() - 0.5) * 60;
            this.dummy.position.z = (Math.random() - 0.5) * 50;
            this.dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);

            const scale = Math.random() * 0.8 + 0.3;
            this.dummy.scale.set(scale, scale, scale);
            this.dummy.updateMatrix();
            this.mesh.setMatrixAt(i, this.dummy.matrix);

            this.positions[i * 3] = this.dummy.position.x;
            this.positions[i * 3 + 1] = this.dummy.position.y;
            this.positions[i * 3 + 2] = this.dummy.position.z;

            this.originalPositions[i * 3] = this.dummy.position.x;
            this.originalPositions[i * 3 + 1] = this.dummy.position.y;
            this.originalPositions[i * 3 + 2] = this.dummy.position.z;

            // PRE-CALCULATE TUNNEL POSITIONS (Ring Formation)
            // Distribute points in a ring/cylinder around Z axis
            const angle = Math.random() * Math.PI * 2;
            const radius = 25 + Math.random() * 20; // Tunnel radius 25-45

            this.tunnelPositions[i * 3] = Math.cos(angle) * radius;
            this.tunnelPositions[i * 3 + 1] = Math.sin(angle) * radius;
            this.tunnelPositions[i * 3 + 2] = (Math.random() - 0.5) * 100; // Spread along length

            this.velocities[i * 3] = (Math.random() - 0.5) * 0.04;
            this.velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.04;
            this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.04;

            this.shockwaveVelocities[i * 3] = 0;
            this.shockwaveVelocities[i * 3 + 1] = 0;
            this.shockwaveVelocities[i * 3 + 2] = 0;

            const isCyan = i % 2 === 0;
            this.color.setHex(isCyan ? 0x00f3ff : 0xbc13fe);
            this.mesh.setColorAt(i, this.color);
        }

        this.scene.add(this.mesh);
    }

    private createConnections(): void {
        const geometry = new THREE.BufferGeometry();
        this.linePositions = new Float32Array(this.maxConnections * 6);
        this.lineColors = new Float32Array(this.maxConnections * 6);

        geometry.setAttribute('position', new THREE.BufferAttribute(this.linePositions, 3).setUsage(THREE.DynamicDrawUsage));
        geometry.setAttribute('color', new THREE.BufferAttribute(this.lineColors, 3).setUsage(THREE.DynamicDrawUsage));

        const material = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending
        });

        this.linesMesh = new THREE.LineSegments(geometry, material);
        this.scene.add(this.linesMesh);
    }

    private setupPostProcessing(): void {
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));

        this.bloomEffect = new BloomEffect({
            intensity: 1.5,
            luminanceThreshold: 0.15,
            luminanceSmoothing: 0.4,
            mipmapBlur: true
        });

        this.composer.addPass(new EffectPass(this.camera, this.bloomEffect));
    }

    private animate = (): void => {
        this.animationId = requestAnimationFrame(this.animate);

        // --- HYPERSPACE LOGIC ---
        const targetWarp = this.isAnalyzing() ? 1.0 : 0.0;
        // Smooth transition (slightly faster for snap)
        this.warpSpeed += (targetWarp - this.warpSpeed) * 0.04;

        // 1. Modulate Bloom
        if (this.bloomEffect) {
            this.bloomEffect.intensity = 1.5 + this.warpSpeed * 3.0; // Max 4.5
        }

        // 2. Modulate FOV
        const targetFOV = this.fovBase + this.warpSpeed * 50; // Widen to 110
        if (Math.abs(this.camera.fov - targetFOV) > 0.1) {
            this.camera.fov += (targetFOV - this.camera.fov) * 0.05;
            this.camera.updateProjectionMatrix();
        }

        // Shockwave decay
        this.clickPulse *= 0.9;
        const mouseRadius = 15;
        const returnForce = 0.03;

        for (let i = 0; i < this.count; i++) {
            this.mesh.getMatrixAt(i, this.dummy.matrix);
            this.dummy.matrix.decompose(this.dummy.position, this.dummy.quaternion, this.dummy.scale);

            // Start (Random Cloud)
            const opx = this.originalPositions[i * 3];
            const opy = this.originalPositions[i * 3 + 1];
            const opz = this.originalPositions[i * 3 + 2];

            // Target (Tunnel Ring)
            const tpx = this.tunnelPositions[i * 3];
            const tpy = this.tunnelPositions[i * 3 + 1];
            // Tunnel Z is dynamic

            let px = this.dummy.position.x;
            let py = this.dummy.position.y;
            let pz = this.dummy.position.z;

            // WARP VS NORMAL
            if (this.warpSpeed > 0.01) {
                // FORMATION BLEND: Interpolate X/Y to tunnel positions
                // As warpSpeed goes 0->1, positions mix from Random(op) to Tunnel(tp)
                const formationStrength = Math.min(1.0, this.warpSpeed * 1.5);

                const targetX = opx * (1 - formationStrength) + tpx * formationStrength;
                const targetY = opy * (1 - formationStrength) + tpy * formationStrength;

                // Move towards target formation
                px += (targetX - px) * 0.1;
                py += (targetY - py) * 0.1;

                // Z MOVEMENT (Speed Tunnel)
                const speed = 2.0 * this.warpSpeed + Math.abs(this.shockwaveVelocities[i * 3 + 2]) + 0.5;
                pz += speed;

                // Infinite Loop
                if (pz > 60) {
                    pz = -120; // Respawn
                    // Don't scramble X/Y during tunnel, keep ring
                }

                // STRETCH EFFECT
                const stretch = 1.0 + (this.warpSpeed * 30.0);
                const thin = 1.0 - (this.warpSpeed * 0.7);
                this.dummy.scale.set(thin * 0.5, thin * 0.5, stretch);

                // COLOR (White/Blue)
                if (this.warpSpeed > 0.5) {
                    this.color.setHSL(0.6, 1.0, 0.9); // Bright White-Blue
                    this.mesh.setColorAt(i, this.color);
                } else {
                    const isCyan = i % 2 === 0;
                    this.color.setHex(isCyan ? 0x00f3ff : 0xbc13fe);
                    this.mesh.setColorAt(i, this.color);
                }

            } else {
                // NORMAL MODE
                this.dummy.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);

                // Velocity drift
                px += this.velocities[i * 3];
                py += this.velocities[i * 3 + 1];
                pz += this.velocities[i * 3 + 2];

                // SHOCKWAVE MOMENTUM
                this.shockwaveVelocities[i * 3] *= 0.95;
                this.shockwaveVelocities[i * 3 + 1] *= 0.95;
                this.shockwaveVelocities[i * 3 + 2] *= 0.95;
                px += this.shockwaveVelocities[i * 3];
                py += this.shockwaveVelocities[i * 3 + 1];
                pz += this.shockwaveVelocities[i * 3 + 2];

                // Mouse Repulsion
                const dx = px - this.mouse3D.x;
                const dy = py - this.mouse3D.y;
                const dz = pz - this.mouse3D.z;
                const distSq = dx * dx + dy * dy + dz * dz;

                if (distSq < mouseRadius * mouseRadius) {
                    const dist = Math.sqrt(distSq);
                    const force = (mouseRadius - dist) / mouseRadius;

                    px += (dx / dist) * force * 0.5;
                    py += (dy / dist) * force * 0.5;
                    pz += (dz / dist) * force * 0.5;

                    this.color.setHSL(0.15, 1.0, 0.5 + force * 0.5);
                    this.mesh.setColorAt(i, this.color);
                    this.dummy.rotation.x += force * 0.1;
                } else {
                    // Spring Back to ORIGINAL (Random)
                    px += (opx - px) * returnForce;
                    py += (opy - py) * returnForce;
                    pz += (opz - pz) * returnForce;

                    if (Math.random() > 0.99) {
                        const isCyan = i % 2 === 0;
                        this.color.setHex(isCyan ? 0x00f3ff : 0xbc13fe);
                        this.mesh.setColorAt(i, this.color);
                    }
                }

                this.dummy.rotation.x += 0.003;
                this.dummy.rotation.y += 0.005;
            }

            this.dummy.position.set(px, py, pz);
            this.dummy.updateMatrix();
            this.mesh.setMatrixAt(i, this.dummy.matrix);

            this.positions[i * 3] = px;
            this.positions[i * 3 + 1] = py;
            this.positions[i * 3 + 2] = pz;
        }

        this.mesh.instanceMatrix.needsUpdate = true;
        this.mesh.instanceColor!.needsUpdate = true;

        // Lines Logic (Quick Fade)
        (this.linesMesh.material as THREE.LineBasicMaterial).opacity = 0.4 * Math.max(0, (1.0 - this.warpSpeed * 2.0));

        if (this.warpSpeed < 0.1) {
            // ... (Network logic same as before, only run when slow)
            // Copying existing logic here would be redundant if we just skip it
            // Implementing basic loop again for safety
            let lineIdx = 0;
            const connectDistSq = 8 * 8;
            for (let i = 0; i < this.count; i++) {
                if (lineIdx >= this.maxConnections) break;
                const ix = this.positions[i * 3];
                const iy = this.positions[i * 3 + 1];
                const iz = this.positions[i * 3 + 2];
                // Optimization: only calculate near mouse
                if ((ix - this.mouse3D.x) ** 2 + (iy - this.mouse3D.y) ** 2 > 900) continue;

                for (let j = i + 1; j < this.count; j++) {
                    if (lineIdx >= this.maxConnections) break;
                    const jx = this.positions[j * 3];
                    const jy = this.positions[j * 3 + 1];
                    const jz = this.positions[j * 3 + 2];
                    if ((ix - jx) ** 2 + (iy - jy) ** 2 + (iz - jz) ** 2 < connectDistSq) {
                        this.linePositions[lineIdx * 6] = ix;
                        this.linePositions[lineIdx * 6 + 1] = iy;
                        this.linePositions[lineIdx * 6 + 2] = iz;
                        this.linePositions[lineIdx * 6 + 3] = jx;
                        this.linePositions[lineIdx * 6 + 4] = jy;
                        this.linePositions[lineIdx * 6 + 5] = jz;

                        this.lineColors[lineIdx * 6] = 0;
                        this.lineColors[lineIdx * 6 + 1] = 1;
                        this.lineColors[lineIdx * 6 + 2] = 1;
                        this.lineColors[lineIdx * 6 + 3] = 1;
                        this.lineColors[lineIdx * 6 + 4] = 0;
                        this.lineColors[lineIdx * 6 + 5] = 1;
                        lineIdx++;
                    }
                }
            }
            this.linesMesh.geometry.setDrawRange(0, lineIdx * 2);
            (this.linesMesh.geometry.attributes['position'] as THREE.BufferAttribute).needsUpdate = true;
        } else {
            this.linesMesh.geometry.setDrawRange(0, 0);
        }

        // Camera Shake (Less when tunneling, more focused)
        if (this.warpSpeed > 0.1) {
            const shake = this.warpSpeed * 0.1; // Reduced shake for smoother tunnel
            this.camera.position.x = (Math.random() - 0.5) * shake;
            this.camera.position.y = (Math.random() - 0.5) * shake;
        } else {
            // Normal parallax
            this.camera.position.x += (this.mouseX * 0.3 - this.camera.position.x) * 0.05;
            this.camera.position.y += (this.mouseY * 0.3 - this.camera.position.y) * 0.05;
        }

        this.camera.lookAt(0, 0, 0);

        this.updateCursor();
        this.composer.render();
    };

    private updateCursor(): void {
        if (!this.cursorDotRef?.nativeElement || !this.cursorOutlineRef?.nativeElement) return;
        const dot = this.cursorDotRef.nativeElement;
        const outline = this.cursorOutlineRef.nativeElement;
        dot.style.left = `${this.cursorX}px`;
        dot.style.top = `${this.cursorY}px`;
        const outlineX = parseFloat(outline.style.left || '0') || 0;
        const outlineY = parseFloat(outline.style.top || '0') || 0;
        outline.style.left = `${outlineX + (this.cursorX - outlineX) * 0.2}px`;
        outline.style.top = `${outlineY + (this.cursorY - outlineY) * 0.2}px`;

        if (this.clickPulse > 0.1) {
            outline.style.width = `${40 + this.clickPulse * 50}px`;
            outline.style.height = `${40 + this.clickPulse * 50}px`;
        } else {
            outline.style.width = '40px';
            outline.style.height = '40px';
        }
    }

    private onMouseMove(event: MouseEvent): void {
        this.mouseX = event.clientX - window.innerWidth / 2;
        this.mouseY = event.clientY - window.innerHeight / 2;
        this.cursorX = event.clientX;
        this.cursorY = event.clientY;

        const x = (event.clientX / window.innerWidth) * 2 - 1;
        const y = -(event.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
        this.raycaster.ray.intersectPlane(this.plane, this.mouse3D);
    }

    private onMouseDown(event: MouseEvent): void {
        this.clickPulse = 1.0;

        for (let i = 0; i < this.count; i++) {
            const ix = this.positions[i * 3];
            const iy = this.positions[i * 3 + 1];
            const iz = this.positions[i * 3 + 2];

            const dx = ix - this.mouse3D.x;
            const dy = iy - this.mouse3D.y;
            const dz = iz - this.mouse3D.z;
            const distSq = dx * dx + dy * dy + dz * dz;

            if (distSq < 40 * 40) {
                const dist = Math.sqrt(distSq);
                const force = 2.0 / (dist + 1.0);

                this.shockwaveVelocities[i * 3] += (dx / dist) * force * 5.0;
                this.shockwaveVelocities[i * 3 + 1] += (dy / dist) * force * 5.0;
                this.shockwaveVelocities[i * 3 + 2] += (dz / dist) * force * 5.0;

                this.color.setHex(0xffaa00);
                this.mesh.setColorAt(i, this.color);
            }
        }
        this.mesh.instanceColor!.needsUpdate = true;
    }

    private onWindowResize(): void {
        const container = this.canvasRef?.nativeElement?.parentElement;
        if (!container) return;
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.composer.setSize(container.clientWidth, container.clientHeight);
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            const file = input.files[0];
            this.selectedFile.set(file);
            const reader = new FileReader();
            reader.onload = () => { this.imagePreviewUrl.set(reader.result as string); };
            reader.readAsDataURL(file);
        }
    }

    analyzeWithAI(): void {
        const file = this.selectedFile();
        if (!file) {
            this.snackbar.open('Please select an image first', 'OK', { duration: 3000 });
            return;
        }

        this.isAnalyzing.set(true);

        this.aiService.analyzeImage(file).subscribe({
            next: (suggestion) => {
                this.listingFormGroup.patchValue({
                    title: suggestion.title,
                    description: suggestion.description,
                    category_id: suggestion.category_id,
                    price: suggestion.price_min,
                });
                this.priceMin.set(suggestion.price_min);
                this.priceMax.set(suggestion.price_max);
                this.categoryService.list().subscribe({ next: (cats) => this.categories.set(cats) });
                this.snackbar.open('AI analysis complete!', 'OK', { duration: 3000 });
                this.isAnalyzing.set(false);
            },
            error: (err) => {
                this.snackbar.open(err.error?.error || 'AI analysis failed', 'OK', { duration: 5000 });
                this.isAnalyzing.set(false);
            },
        });
    }

    togglePreview(): void {
        this.previewMode.set(!this.previewMode());
    }

    createListing(): void {
        if (!this.listingFormGroup.valid) {
            this.snackbar.open('Fill required fields', 'OK', { duration: 3000 });
            return;
        }
        const file = this.selectedFile();
        if (!file) {
            this.snackbar.open('Select an image', 'OK', { duration: 3000 });
            return;
        }

        // Request browser location
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.submitListing(file, position.coords.latitude, position.coords.longitude);
                },
                (error) => {
                    console.warn('Geolocation error:', error.message);
                    // Submit without location if permission denied or unavailable
                    this.submitListing(file, null, null);
                },
                { enableHighAccuracy: false, timeout: 10000 }
            );
        } else {
            this.submitListing(file, null, null);
        }
    }

    private submitListing(file: File, lat: number | null, lng: number | null): void {
        const formData = new FormData();
        formData.append('title', this.listingFormGroup.value.title || '');
        formData.append('description', this.listingFormGroup.value.description || '');
        formData.append('price', String(this.listingFormGroup.value.price || 0));
        formData.append('image', file);
        if (this.listingFormGroup.value.category_id) {
            formData.append('category_id', String(this.listingFormGroup.value.category_id));
        }

        // Add location if available
        if (lat !== null && lng !== null) {
            formData.append('latitude', lat.toString());
            formData.append('longitude', lng.toString());
        }

        this.http.post('/api/market/products/', formData).subscribe({
            next: () => {
                this.snackbar.open('Success!', 'OK', { duration: 3000 });
                this.router.navigate(['/products']);
            },
            error: (err) => {
                this.snackbar.open(err.error?.detail || 'Failed', 'OK', { duration: 5000 });
            },
        });
    }
}

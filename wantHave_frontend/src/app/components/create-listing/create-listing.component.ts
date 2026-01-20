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
import { EffectComposer, RenderPass, BloomEffect, EffectPass } from 'postprocessing';

import { AiService } from '../../services/ai.service';
import { CategoryService } from '../../services/category.service';
import { Category } from '../../interfaces/category';

interface Moon {
    mesh: THREE.Mesh;
    orbitRadius: number;
    orbitSpeed: number;
    angle: number;
    name: string;
}

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

    // Dependency injection
    private http = inject(HttpClient);
    private router = inject(Router);
    private snackbar = inject(MatSnackBar);
    private aiService = inject(AiService);
    private categoryService = inject(CategoryService);

    // Three.js properties
    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private renderer!: THREE.WebGLRenderer;
    private composer!: EffectComposer;
    private saturn!: THREE.Mesh;
    private rings!: THREE.Mesh;
    private stars!: THREE.Points;
    private moons: Moon[] = [];
    private orbitLines: THREE.Line[] = [];
    private animationId!: number;
    private mouseX = 0;
    private mouseY = 0;

    // Hyperspace effect
    private hyperspaceActive = false;
    private starPositions!: Float32Array;
    private originalStarPositions!: Float32Array;
    private hyperspaceStars: THREE.Points[] = [];

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
        this.categoryService.list().subscribe({
            next: (cats) => this.categories.set(cats),
            error: () => this.snackbar.open('Failed to load categories', 'OK', { duration: 3000 }),
        });
    }

    ngAfterViewInit(): void {
        this.initThreeJS();
        this.createScene();
        this.setupPostProcessing();
        this.animate();
        window.addEventListener('resize', this.onWindowResize.bind(this));
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
    }

    ngOnDestroy(): void {
        cancelAnimationFrame(this.animationId);
        window.removeEventListener('resize', this.onWindowResize.bind(this));
        window.removeEventListener('mousemove', this.onMouseMove.bind(this));
        this.renderer?.dispose();
        this.composer?.dispose();
    }

    private initThreeJS(): void {
        const canvas = this.canvasRef.nativeElement;
        const container = canvas.parentElement!;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000003);

        this.camera = new THREE.PerspectiveCamera(
            60,
            container.clientWidth / container.clientHeight,
            0.1,
            2000
        );
        this.camera.position.set(0, 2, 12);

        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
    }

    private setupPostProcessing(): void {
        // Create post-processing composer
        this.composer = new EffectComposer(this.renderer);

        // Render pass
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // Bloom effect - makes bright objects glow
        const bloomEffect = new BloomEffect({
            intensity: 1.5,
            luminanceThreshold: 0.2,
            luminanceSmoothing: 0.9,
            mipmapBlur: true,
        });

        const effectPass = new EffectPass(this.camera, bloomEffect);
        this.composer.addPass(effectPass);
    }

    private createScene(): void {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x333344, 0.4);
        this.scene.add(ambientLight);

        // Sun light
        const sunLight = new THREE.DirectionalLight(0xffffff, 2);
        sunLight.position.set(50, 30, 50);
        this.scene.add(sunLight);

        // Rim light for Saturn
        const rimLight = new THREE.PointLight(0x8b5cf6, 0.5, 50);
        rimLight.position.set(-15, 5, -10);
        this.scene.add(rimLight);

        this.createSaturn();
        this.createMoons();
        this.createStars();
        this.createHyperspaceStars();
        this.createOrbits();
    }

    private createSaturn(): void {
        // Saturn body
        const saturnGeometry = new THREE.SphereGeometry(2, 64, 64);

        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d')!;

        const gradient = ctx.createLinearGradient(0, 0, 0, 256);
        gradient.addColorStop(0, '#f4d58d');
        gradient.addColorStop(0.15, '#e6c77a');
        gradient.addColorStop(0.3, '#d4a84f');
        gradient.addColorStop(0.5, '#c9a054');
        gradient.addColorStop(0.7, '#d4a84f');
        gradient.addColorStop(0.85, '#e6c77a');
        gradient.addColorStop(1, '#f4d58d');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 256);

        for (let i = 0; i < 256; i += 3) {
            ctx.fillStyle = `rgba(${100 + Math.random() * 60}, ${80 + Math.random() * 40}, ${30 + Math.random() * 30}, ${Math.random() * 0.12})`;
            ctx.fillRect(0, i, 512, 2);
        }

        const saturnTexture = new THREE.CanvasTexture(canvas);

        const saturnMaterial = new THREE.MeshStandardMaterial({
            map: saturnTexture,
            roughness: 0.7,
            metalness: 0.1,
            emissive: new THREE.Color(0x332200),
            emissiveIntensity: 0.1,
        });

        this.saturn = new THREE.Mesh(saturnGeometry, saturnMaterial);
        this.saturn.rotation.z = 0.4;
        this.saturn.position.set(5, 1, -3);
        this.scene.add(this.saturn);

        // Rings with Cassini Division
        const ringGeometry = new THREE.RingGeometry(2.5, 4.2, 128);

        const ringCanvas = document.createElement('canvas');
        ringCanvas.width = 512;
        ringCanvas.height = 64;
        const ringCtx = ringCanvas.getContext('2d')!;

        const ringGradient = ringCtx.createLinearGradient(0, 0, 512, 0);
        ringGradient.addColorStop(0, 'rgba(200, 180, 140, 0)');
        ringGradient.addColorStop(0.1, 'rgba(200, 180, 140, 0.5)');
        ringGradient.addColorStop(0.25, 'rgba(190, 170, 130, 0.7)');
        ringGradient.addColorStop(0.35, 'rgba(50, 40, 30, 0.1)'); // Cassini Division
        ringGradient.addColorStop(0.4, 'rgba(50, 40, 30, 0.1)');  // Cassini Division
        ringGradient.addColorStop(0.45, 'rgba(200, 180, 140, 0.8)');
        ringGradient.addColorStop(0.6, 'rgba(190, 170, 130, 0.6)');
        ringGradient.addColorStop(0.8, 'rgba(180, 160, 120, 0.4)');
        ringGradient.addColorStop(1, 'rgba(160, 140, 100, 0)');

        ringCtx.fillStyle = ringGradient;
        ringCtx.fillRect(0, 0, 512, 64);

        const ringTexture = new THREE.CanvasTexture(ringCanvas);

        const ringMaterial = new THREE.MeshBasicMaterial({
            map: ringTexture,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9,
        });

        this.rings = new THREE.Mesh(ringGeometry, ringMaterial);
        this.rings.rotation.x = Math.PI / 2 - 0.4;
        this.rings.rotation.z = 0.4;
        this.rings.position.copy(this.saturn.position);
        this.scene.add(this.rings);
    }

    private createMoons(): void {
        const moonData = [
            { name: 'Titan', radius: 0.25, orbitRadius: 6, speed: 0.005, color: 0xd4a84f },
            { name: 'Enceladus', radius: 0.12, orbitRadius: 5, speed: 0.008, color: 0xffffff },
            { name: 'Rhea', radius: 0.15, orbitRadius: 7.5, speed: 0.003, color: 0xcccccc },
        ];

        moonData.forEach((data, index) => {
            const moonGeometry = new THREE.SphereGeometry(data.radius, 32, 32);
            const moonMaterial = new THREE.MeshStandardMaterial({
                color: data.color,
                roughness: 0.8,
                metalness: 0.1,
                emissive: new THREE.Color(data.color),
                emissiveIntensity: 0.2,
            });

            const moon = new THREE.Mesh(moonGeometry, moonMaterial);
            const angle = (index * Math.PI * 2) / 3; // Distribute evenly

            moon.position.set(
                this.saturn.position.x + Math.cos(angle) * data.orbitRadius,
                this.saturn.position.y + (Math.random() - 0.5) * 0.5,
                this.saturn.position.z + Math.sin(angle) * data.orbitRadius * 0.5
            );

            this.scene.add(moon);

            this.moons.push({
                mesh: moon,
                orbitRadius: data.orbitRadius,
                orbitSpeed: data.speed,
                angle: angle,
                name: data.name,
            });

            // Create moon orbit path
            const orbitGeometry = new THREE.BufferGeometry();
            const orbitPoints = [];
            for (let i = 0; i <= 64; i++) {
                const theta = (i / 64) * Math.PI * 2;
                orbitPoints.push(new THREE.Vector3(
                    this.saturn.position.x + Math.cos(theta) * data.orbitRadius,
                    this.saturn.position.y,
                    this.saturn.position.z + Math.sin(theta) * data.orbitRadius * 0.5
                ));
            }
            orbitGeometry.setFromPoints(orbitPoints);

            const orbitMaterial = new THREE.LineBasicMaterial({
                color: 0x8b5cf6,
                transparent: true,
                opacity: 0.15,
            });

            const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
            this.scene.add(orbitLine);
        });
    }

    private createStars(): void {
        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.1,
            transparent: true,
            opacity: 0.9,
            sizeAttenuation: true,
        });

        const starsCount = 4000;
        this.starPositions = new Float32Array(starsCount * 3);
        this.originalStarPositions = new Float32Array(starsCount * 3);

        for (let i = 0; i < starsCount; i++) {
            const radius = 80 + Math.random() * 400;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);

            this.starPositions[i * 3] = x;
            this.starPositions[i * 3 + 1] = y;
            this.starPositions[i * 3 + 2] = z;

            this.originalStarPositions[i * 3] = x;
            this.originalStarPositions[i * 3 + 1] = y;
            this.originalStarPositions[i * 3 + 2] = z;
        }

        starsGeometry.setAttribute('position', new THREE.BufferAttribute(this.starPositions, 3));
        this.stars = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(this.stars);
    }

    private createHyperspaceStars(): void {
        // Create elongated stars for hyperspace effect
        for (let layer = 0; layer < 3; layer++) {
            const geometry = new THREE.BufferGeometry();
            const material = new THREE.PointsMaterial({
                color: layer === 0 ? 0xffffff : layer === 1 ? 0x8b5cf6 : 0x3b82f6,
                size: 0.15 + layer * 0.1,
                transparent: true,
                opacity: 0,
                sizeAttenuation: true,
            });

            const count = 500;
            const positions = new Float32Array(count * 3);

            for (let i = 0; i < count; i++) {
                positions[i * 3] = (Math.random() - 0.5) * 100;
                positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
                positions[i * 3 + 2] = Math.random() * -200;
            }

            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const points = new THREE.Points(geometry, material);
            this.hyperspaceStars.push(points);
            this.scene.add(points);
        }
    }

    private createOrbits(): void {
        const orbitRadii = [15, 25, 35, 50];
        const orbitColors = [0x3b82f6, 0x8b5cf6, 0x06b6d4, 0xfbbf24];

        orbitRadii.forEach((radius, index) => {
            const orbitGeometry = new THREE.BufferGeometry();
            const points = [];
            const segments = 128;

            for (let i = 0; i <= segments; i++) {
                const theta = (i / segments) * Math.PI * 2;
                points.push(new THREE.Vector3(
                    Math.cos(theta) * radius,
                    (Math.random() - 0.5) * 0.3,
                    Math.sin(theta) * radius * 0.3
                ));
            }

            orbitGeometry.setFromPoints(points);

            const orbitMaterial = new THREE.LineBasicMaterial({
                color: orbitColors[index],
                transparent: true,
                opacity: 0.12,
            });

            const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
            orbitLine.rotation.x = Math.PI / 2;
            orbitLine.position.y = -2;
            this.scene.add(orbitLine);
            this.orbitLines.push(orbitLine);
        });
    }

    private startHyperspace(): void {
        this.hyperspaceActive = true;

        // Fade in hyperspace stars
        this.hyperspaceStars.forEach((stars, i) => {
            const material = stars.material as THREE.PointsMaterial;
            material.opacity = 0.8 - i * 0.2;
        });
    }

    private stopHyperspace(): void {
        this.hyperspaceActive = false;

        // Fade out hyperspace stars
        this.hyperspaceStars.forEach(stars => {
            const material = stars.material as THREE.PointsMaterial;
            material.opacity = 0;
        });

        // Reset star positions
        for (let i = 0; i < this.starPositions.length; i++) {
            this.starPositions[i] = this.originalStarPositions[i];
        }
        if (this.stars) {
            this.stars.geometry.attributes['position'].needsUpdate = true;
        }
    }

    private animate = (): void => {
        this.animationId = requestAnimationFrame(this.animate);

        // Rotate Saturn
        if (this.saturn) {
            this.saturn.rotation.y += 0.002;
        }
        if (this.rings) {
            this.rings.rotation.z += 0.001;
        }

        // Animate moons orbiting Saturn
        this.moons.forEach(moon => {
            moon.angle += moon.orbitSpeed;
            moon.mesh.position.set(
                this.saturn.position.x + Math.cos(moon.angle) * moon.orbitRadius,
                this.saturn.position.y + Math.sin(moon.angle * 0.5) * 0.3,
                this.saturn.position.z + Math.sin(moon.angle) * moon.orbitRadius * 0.5
            );
            moon.mesh.rotation.y += 0.01;
        });

        // Hyperspace animation
        if (this.hyperspaceActive) {
            // Stretch stars toward camera
            for (let i = 0; i < this.starPositions.length; i += 3) {
                this.starPositions[i + 2] += 2; // Move toward camera
                if (this.starPositions[i + 2] > 50) {
                    this.starPositions[i + 2] = -300;
                }
            }
            if (this.stars) {
                this.stars.geometry.attributes['position'].needsUpdate = true;
            }

            // Animate hyperspace streaks
            this.hyperspaceStars.forEach((stars, layerIndex) => {
                const positions = stars.geometry.attributes['position'].array as Float32Array;
                for (let i = 0; i < positions.length; i += 3) {
                    positions[i + 2] += 3 + layerIndex * 2;
                    if (positions[i + 2] > 50) {
                        positions[i + 2] = -200;
                    }
                }
                stars.geometry.attributes['position'].needsUpdate = true;
            });
        }

        // Parallax with mouse
        const targetX = this.mouseX * 0.0003;
        const targetY = this.mouseY * 0.0003;
        this.camera.rotation.y += (targetX - this.camera.rotation.y) * 0.02;
        this.camera.rotation.x += (-targetY - this.camera.rotation.x) * 0.02;

        // Rotate stars slowly
        if (this.stars && !this.hyperspaceActive) {
            this.stars.rotation.y += 0.0001;
        }

        // Render with post-processing
        this.composer.render();
    };

    private onWindowResize(): void {
        const container = this.canvasRef?.nativeElement?.parentElement;
        if (!container) return;

        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.composer.setSize(container.clientWidth, container.clientHeight);
    }

    private onMouseMove(event: MouseEvent): void {
        this.mouseX = event.clientX - window.innerWidth / 2;
        this.mouseY = event.clientY - window.innerHeight / 2;
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            const file = input.files[0];
            this.selectedFile.set(file);

            const reader = new FileReader();
            reader.onload = () => {
                this.imagePreviewUrl.set(reader.result as string);
            };
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
        this.startHyperspace(); // 🚀 Start hyperspace effect!

        this.aiService.analyzeImage(file).subscribe({
            next: (suggestion) => {
                this.stopHyperspace(); // Stop hyperspace on success

                this.listingFormGroup.patchValue({
                    title: suggestion.title,
                    description: suggestion.description,
                    category_id: suggestion.category_id,
                    price: suggestion.price_min,
                });

                this.priceMin.set(suggestion.price_min);
                this.priceMax.set(suggestion.price_max);

                this.categoryService.list().subscribe({
                    next: (cats) => this.categories.set(cats),
                });

                this.snackbar.open('AI analysis complete! Review and edit the suggestions.', 'OK', {
                    duration: 3000,
                });
                this.isAnalyzing.set(false);
            },
            error: (err) => {
                this.stopHyperspace(); // Stop hyperspace on error
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
            this.snackbar.open('Please fill all required fields', 'OK', { duration: 3000 });
            return;
        }

        const file = this.selectedFile();
        if (!file) {
            this.snackbar.open('Please select an image', 'OK', { duration: 3000 });
            return;
        }

        const formData = new FormData();
        formData.append('title', this.listingFormGroup.value.title || '');
        formData.append('description', this.listingFormGroup.value.description || '');
        formData.append('price', String(this.listingFormGroup.value.price || 0));
        formData.append('image', file);

        if (this.listingFormGroup.value.category_id) {
            formData.append('category_id', String(this.listingFormGroup.value.category_id));
        }

        this.http.post('/api/market/products/', formData).subscribe({
            next: () => {
                this.snackbar.open('Listing created successfully!', 'OK', { duration: 3000 });
                this.router.navigate(['/products']);
            },
            error: (err) => {
                this.snackbar.open(err.error?.detail || 'Failed to create listing', 'OK', {
                    duration: 5000,
                });
            },
        });
    }
}

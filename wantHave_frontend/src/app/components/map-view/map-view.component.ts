import { Component, OnInit, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import { Product } from '../../interfaces/product';
import { ProductService } from '../../services/product.service';

@Component({
    selector: 'app-map-view',
    standalone: true,
    imports: [CommonModule, RouterLink, MatButtonModule, MatCardModule, MatProgressSpinnerModule],
    templateUrl: './map-view.component.html',
    styleUrl: './map-view.component.scss',
})
export class MapViewComponent implements OnInit, AfterViewInit {
    private productService = inject(ProductService);
    private router = inject(Router);

    products: Product[] = [];
    loading = true;
    error = '';
    private map!: L.Map;
    // Use MarkerClusterGroup (installed via npm and imported)
    private markersLayer!: L.MarkerClusterGroup;

    ngOnInit() {
        this.fetchProducts();
    }

    ngAfterViewInit() {
        this.initMap();
    }

    private initMap() {
        // Default center (Europe)
        this.map = L.map('map', {
            center: [48.8566, 2.3522],
            zoom: 5,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
        }).addTo(this.map);

        // Initialize marker cluster group
        this.markersLayer = L.markerClusterGroup({
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            spiderfyOnMaxZoom: true
        });
        this.map.addLayer(this.markersLayer);

        // If products already loaded (API responded before view init), add markers now
        if (this.products.length > 0) {
            this.addMarkers();
        }
    }

    fetchProducts() {
        this.loading = true;
        this.productService.list().subscribe({
            next: (products) => {
                this.products = products.filter(p => p.latitude && p.longitude);
                this.loading = false;
                // Only add markers if the map is already initialized
                if (this.map && this.markersLayer) {
                    this.addMarkers();
                }
            },
            error: (err) => {
                console.error('Failed to load products', err);
                this.error = 'Could not load products.';
                this.loading = false;
            },
        });
    }

    private addMarkers() {
        this.markersLayer.clearLayers();

        const bounds: L.LatLngBoundsExpression = [];

        this.products.forEach((product) => {
            if (product.latitude && product.longitude) {
                // 1. Create the physical radius circle (visual only, scales with map)
                const radiusCircle = L.circle([product.latitude, product.longitude], {
                    color: '#8b5cf6',       // Purple outline
                    fillColor: '#a78bfa',   // Lighter purple fill
                    fillOpacity: 0.3,
                    radius: 2000,           // 2km physical radius
                    interactive: false      // Let clicks pass through to the map or marker
                });

                // 2. Create the center dot marker (for clustering and interaction)
                const centerIcon = L.divIcon({
                    className: 'center-dot-marker', // New style for small dot
                    iconSize: [12, 12],
                    iconAnchor: [6, 6]
                });

                const marker = L.marker([product.latitude, product.longitude], { icon: centerIcon });

                const popupContent = `
          <div style="min-width: 200px">
            <strong>${product.title}</strong><br>
            <span style="color: #22c55e; font-weight: 600;">${product.price} €</span><br>
            <small>${product.city || 'Approximate location'}</small><br>
            <a href="/products/${product.id}" style="color: #3b82f6;">View Details →</a>
          </div>
        `;

                marker.bindPopup(popupContent);

                // 3. Sync Circle visibility with Marker visibility (clustering)
                marker.on('add', () => {
                    radiusCircle.addTo(this.map);
                    // Ensure circle is behind markers but above tiles
                    radiusCircle.bringToBack();
                });

                marker.on('remove', () => {
                    radiusCircle.removeFrom(this.map);
                });

                // Add only the marker to the cluster group
                // The circle is managed by the marker's events
                this.markersLayer.addLayer(marker);

                bounds.push([product.latitude, product.longitude]);
            }
        });

        // Fit map to markers if any
        if (bounds.length > 0) {
            this.map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50] });
        }
    }

    goToProduct(productId: number) {
        this.router.navigate(['/products', productId]);
    }
}

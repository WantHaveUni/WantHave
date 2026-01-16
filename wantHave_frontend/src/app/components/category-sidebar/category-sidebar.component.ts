import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Category } from '../../interfaces/category';

@Component({
  selector: 'app-category-sidebar',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  templateUrl: './category-sidebar.component.html',
  styleUrl: './category-sidebar.component.scss',
})
export class CategorySidebarComponent {
  @Input() categories: Category[] = [];
  @Input() selectedId: number | null = null;
  @Output() categoryChange = new EventEmitter<number | null>();

  selectCategory(id: number | null) {
    this.categoryChange.emit(id);
  }

  get breadcrumb(): Category[] {
    if (!this.selectedId) {
      return [];
    }

    const byId = new Map(this.categories.map((category) => [category.id, category]));
    const trail: Category[] = [];
    let current = byId.get(this.selectedId) ?? null;

    while (current) {
      trail.unshift(current);
      current = current.parent ? byId.get(current.parent) ?? null : null;
    }

    return trail;
  }

  get visibleCategories(): Category[] {
    const parentId = this.selectedId ?? null;
    return this.categories.filter((category) => category.parent === parentId);
  }
}

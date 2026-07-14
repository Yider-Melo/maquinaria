import { Component, Input } from '@angular/core';

@Component({
  standalone: false,
  selector: 'app-skeleton-card',
  templateUrl: './skeleton-card.html',
  styleUrls: ['./skeleton-card.css']
})
export class SkeletonCard {
  @Input() variant: 'card' | 'list' | 'table' = 'card';
}

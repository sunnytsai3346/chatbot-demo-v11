import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({ name: 'markdown' })
export class MarkdownPipe implements PipeTransform {
    constructor(private sanitizer: DomSanitizer) {}
    
    transform(value: string): SafeHtml {
        
        if (!value) return '';
        const html = value.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
        return this.sanitizer.bypassSecurityTrustHtml(html);
    }
}
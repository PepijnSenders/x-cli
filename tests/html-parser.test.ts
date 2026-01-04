import { describe, test, expect } from 'bun:test';
import {
  htmlToMarkdown,
  parseHTML,
  extractText,
  extractLinks,
  extractImages,
} from '../src/utils/html-parser';

describe('htmlToMarkdown', () => {
  test('converts basic HTML to markdown', () => {
    const html = '<h1>Hello</h1><p>World</p>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('# Hello');
    expect(md).toContain('World');
  });

  test('converts links', () => {
    // Use longer link text or context to avoid short-link cleanup
    const html = '<p>Visit <a href="https://example.com">Example Website Here</a> for more info.</p>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('[Example Website Here](https://example.com');
  });

  test('converts lists', () => {
    const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('- Item 1');
    expect(md).toContain('- Item 2');
  });

  test('converts code blocks', () => {
    const html = '<pre><code class="language-js">const x = 1;</code></pre>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('```js');
    expect(md).toContain('const x = 1;');
    expect(md).toContain('```');
  });

  test('removes tracking params from links', () => {
    // Use longer link text or context to avoid short-link cleanup
    const html = '<p>Check out <a href="https://example.com?utm_source=test&id=123">This Interesting Article</a> today.</p>';
    const md = htmlToMarkdown(html);
    expect(md).not.toContain('utm_source');
    expect(md).toContain('id=123');
  });

  test('adds source footer when URL provided', () => {
    const html = '<p>Content</p>';
    const md = htmlToMarkdown(html, 'https://example.com');
    expect(md).toContain('Source: https://example.com');
  });

  test('removes empty elements', () => {
    const html = '<div></div><p>Text</p><span>  </span>';
    const md = htmlToMarkdown(html);
    expect(md).toBe('Text');
  });
});

describe('parseHTML', () => {
  test('querySelector finds elements', () => {
    const doc = parseHTML('<div class="test">Hello</div>');
    const el = doc.querySelector('.test');
    expect(el).not.toBeNull();
    expect(el?.textContent).toBe('Hello');
  });

  test('querySelectorAll finds multiple elements', () => {
    const doc = parseHTML('<p>One</p><p>Two</p><p>Three</p>');
    const els = doc.querySelectorAll('p');
    expect(els).toHaveLength(3);
  });

  test('getText returns text content', () => {
    const doc = parseHTML('<h1>Title</h1>');
    expect(doc.getText('h1')).toBe('Title');
  });

  test('getText returns null for missing elements', () => {
    const doc = parseHTML('<p>Text</p>');
    expect(doc.getText('h1')).toBeNull();
  });

  test('getTexts returns array of text content', () => {
    const doc = parseHTML('<li>A</li><li>B</li><li>C</li>');
    expect(doc.getTexts('li')).toEqual(['A', 'B', 'C']);
  });

  test('getAttribute returns attribute value', () => {
    const doc = parseHTML('<a href="https://example.com">Link</a>');
    expect(doc.getAttribute('a', 'href')).toBe('https://example.com');
  });

  test('getAttributes returns array of attribute values', () => {
    const doc = parseHTML('<a href="one">1</a><a href="two">2</a>');
    expect(doc.getAttributes('a', 'href')).toEqual(['one', 'two']);
  });
});

describe('extractText', () => {
  test('extracts text from HTML', () => {
    const html = '<html><body><div><h1>Title</h1><p>Paragraph</p></div></body></html>';
    const text = extractText(html);
    expect(text).toContain('Title');
    expect(text).toContain('Paragraph');
  });

  test('strips HTML tags', () => {
    const html = '<html><body><b>Bold</b> and <i>italic</i></body></html>';
    const text = extractText(html);
    expect(text).not.toContain('<b>');
    expect(text).not.toContain('<i>');
    expect(text).toContain('Bold');
    expect(text).toContain('italic');
  });
});

describe('extractLinks', () => {
  test('extracts links with href and text', () => {
    const html = '<a href="https://example.com">Example</a>';
    const links = extractLinks(html);
    expect(links).toHaveLength(1);
    expect(links[0].href).toBe('https://example.com');
    expect(links[0].text).toBe('Example');
  });

  test('extracts multiple links', () => {
    const html = '<a href="one">1</a><a href="two">2</a>';
    const links = extractLinks(html);
    expect(links).toHaveLength(2);
  });

  test('ignores links without href', () => {
    const html = '<a>No href</a><a href="valid">Valid</a>';
    const links = extractLinks(html);
    expect(links).toHaveLength(1);
    expect(links[0].href).toBe('valid');
  });
});

describe('extractImages', () => {
  test('extracts images with src and alt', () => {
    const html = '<img src="image.jpg" alt="Description">';
    const images = extractImages(html);
    expect(images).toHaveLength(1);
    expect(images[0].src).toBe('image.jpg');
    expect(images[0].alt).toBe('Description');
  });

  test('extracts multiple images', () => {
    const html = '<img src="one.jpg"><img src="two.jpg">';
    const images = extractImages(html);
    expect(images).toHaveLength(2);
  });

  test('handles missing alt', () => {
    const html = '<img src="image.jpg">';
    const images = extractImages(html);
    expect(images[0].alt).toBe('');
  });
});

/**
 * A tiny helper to build DOM nodes safely.
 * Using textContent prevents XSS attacks (never use innerHTML with data).
 */
export function el(tag, props = {}, children = []) {
  const element = document.createElement(tag);
  
  for (const [key, value] of Object.entries(props)) {
    if (key === 'className') element.className = value;
    else if (key === 'textContent') element.textContent = value;
    else if (key.startsWith('on')) element.addEventListener(key.toLowerCase().substring(2), value);
    else element.setAttribute(key, value);
  }

  for (const child of children) {
    if (typeof child === 'string') element.appendChild(document.createTextNode(child));
    else if (child instanceof Node) element.appendChild(child);
  }

  return element;
}

/**
 * Formats whole cents into a readable Naira string.
 * 250000 -> ₦2,500
 */
export function formatMoney(cents) {
  if (cents === null || cents === undefined) return 'N/A';
  return '₦' + (cents / 100).toLocaleString('en-NG', { minimumFractionDigits: 0 });
}
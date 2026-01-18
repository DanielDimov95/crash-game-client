# Tailwind CSS Setup

## Issue: Tailwind classes not applying

If Tailwind CSS classes are not being applied, follow these steps:

1. **Ensure packages are installed:**
   ```bash
   npm install
   ```

2. **Verify configuration files exist:**
   - `tailwind.config.js` - ✓ Present
   - `postcss.config.js` - ✓ Present
   - `src/styles.css` contains Tailwind directives - ✓ Present

3. **Restart the Angular dev server:**
   ```bash
   # Stop the current server (Ctrl+C)
   npm start
   ```

4. **Clear Angular cache if needed:**
   ```bash
   rm -rf .angular/cache
   # or on Windows:
   rmdir /s /q .angular\cache
   ```

5. **Verify Tailwind is processing:**
   - Check browser DevTools Network tab
   - Look for `styles.css` being loaded
   - Inspect elements to see if Tailwind classes are applied

## Configuration Files

- **tailwind.config.js**: Configures which files Tailwind should scan for classes
- **postcss.config.js**: Configures PostCSS to use Tailwind and Autoprefixer
- **src/styles.css**: Contains Tailwind directives (@tailwind base, components, utilities)

## Troubleshooting

If classes still don't apply:
1. Check browser console for errors
2. Verify `src/styles.css` is included in `angular.json` styles array
3. Ensure PostCSS is processing (check build output)
4. Try rebuilding: `npm run build`

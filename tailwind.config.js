module.exports = {
    content: [
      "./src/**/*.{js,jsx,ts,tsx}",
      "./public/index.html"
    ],
    theme: {
      extend: {
        colors: {
          primary: {
            50: '#f0f7ff',
            100: '#e0effe',
            200: '#bae0fd',
            300: '#7cc5fb',
            400: '#36a4f5',
            500: '#0c87e0',
            600: '#0069bd',
            700: '#00559a',
            800: '#064977',
            900: '#0a3e66',
          },
          neutral: {
            50: '#f9fafb',
            100: '#f4f5f7',
            200: '#e5e7eb',
            300: '#d2d6dc',
            400: '#9fa6b2',
            500: '#6b7280',
            600: '#4b5563',
            700: '#374151',
            800: '#1f2937',
            900: '#111827',
          },
          success: {
            50: '#ecfdf5',
            500: '#10b981',
            700: '#047857',
          },
          warning: {
            50: '#fffbeb',
            500: '#f59e0b',
            700: '#b45309',
          },
          error: {
            50: '#fef2f2',
            500: '#ef4444',
            700: '#b91c1c',
          },
        },
        fontFamily: {
          sans: ['Inter var', 'sans-serif'],
          mono: ['JetBrains Mono', 'monospace'],
        },
        boxShadow: {
          subtle: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.05)',
          card: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
          elevated: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)',
        },
        borderRadius: {
          'sm': '0.25rem',
          'md': '0.375rem',
          'lg': '0.5rem',
        },
      },
    },
    plugins: [],
  }
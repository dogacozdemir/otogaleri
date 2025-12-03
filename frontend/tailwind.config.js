module.exports = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      colors: {
        // ESNAF-FOCUSED PROFESSIONAL COLOR PALETTE
        
        // Primary Navy - Trustworthy & Professional
        navy: {
          50: '#f0f4ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#003d82', // Primary trustworthy navy
          700: '#002952',
          800: '#001a33',
          900: '#000d1a'
        },
        
        // Professional Gray Scale
        gray: {
          50: '#f8f9fa',  // Warm background
          100: '#f1f3f4', // Very light gray
          200: '#e2e8f0', // Light border
          300: '#cbd5e1', // Medium border
          400: '#94a3b8', // Placeholder text
          500: '#6b7280', // Body text
          600: '#4b5563', // Heading text
          700: '#374151', // Dark text
          800: '#2d3748', // Very dark text
          900: '#1a202c'  // Almost black
        },
        
        // Business Status Colors - Clear & Accessible
        business: {
          primary: '#003d82',    // Trustworthy navy
          success: '#16a34a',    // Clear green
          warning: '#f59e0b',    // Clear orange
          error: '#ef4444',      // Clear red
          info: '#8b5cf6'        // Professional purple
        },
        
        // Legacy support (keeping for compatibility)
        blue: {
          50: '#f0f4ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#003d82', // Updated to match navy
          700: '#002952',
          800: '#001a33',
          900: '#000d1a'
        },
        
        // Status Colors (updated for better accessibility)
        success: '#16a34a',  // More accessible green
        warning: '#f59e0b',  // Clear orange
        error: '#ef4444',    // Clear red
        info: '#8b5cf6',     // Professional purple
        // Shadcn/ui color system
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))'
        }
      },
      backgroundImage: {
        // PROFESSIONAL GRADIENTS FOR ESNAF
        'gradient-primary': 'linear-gradient(135deg, #003d82 0%, #0052a3 100%)',
        'gradient-feature': 'linear-gradient(to bottom right, #f8f9fa, #f0f4ff)',
        'gradient-card-hover': 'linear-gradient(to right, #f0f4ff, #f8f9fa)',
        'gradient-success': 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
        'gradient-professional': 'linear-gradient(to right, #f8f9fa, #ffffff)',
        
        // Subtle business gradients
        'gradient-trustworthy': 'linear-gradient(135deg, #003d82 0%, #002952 100%)',
        'gradient-reliable': 'linear-gradient(to bottom, #ffffff, #f8f9fa)',
        'gradient-clean': 'linear-gradient(45deg, #f8f9fa 0%, #f0f4ff 50%, #f8f9fa 100%)'
      },
      
      // Professional Spacing Scale
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      
      // Professional Font Sizes
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.4' }],
        'sm': ['0.875rem', { lineHeight: '1.4' }],
        'base': ['1rem', { lineHeight: '1.5' }],
        'lg': ['1.125rem', { lineHeight: '1.3' }],
        'xl': ['1.25rem', { lineHeight: '1.3' }],
        '2xl': ['1.5rem', { lineHeight: '1.2' }],
        '3xl': ['1.875rem', { lineHeight: '1.2' }],
        '4xl': ['2.25rem', { lineHeight: '1.1' }],
        '5xl': ['3rem', { lineHeight: '1.1' }],
      },
      
      // Professional Box Shadows
      boxShadow: {
        'professional-sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'professional': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'professional-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'professional-xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
};

import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import handlebars from 'vite-plugin-handlebars'
import { resolve } from 'path'

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : '/luxury-cars/',
  server: {
    port: 5173,
    strictPort: true,
  },
  plugins: [
    tailwindcss(),
    handlebars({
      partialDirectory: resolve(__dirname, 'src/partials'),
      context: {
        baseUrl: command === 'serve' ? '/' : '/luxury-cars/',
      },
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        main:       resolve(__dirname, 'index.html'),
        fleet:      resolve(__dirname, 'pages/fleet.html'),
        checkout:   resolve(__dirname, 'pages/checkout.html'),
        login:      resolve(__dirname, 'pages/login.html'),
        register:   resolve(__dirname, 'pages/register.html'),
        myBookings: resolve(__dirname, 'pages/my-bookings.html'),
        about:      resolve(__dirname, 'pages/about.html'),
        contact:    resolve(__dirname, 'pages/contact.html'),
        notFound:   resolve(__dirname, 'pages/404.html'),
        admin:      resolve(__dirname, 'pages/admin.html'),
        reviews:    resolve(__dirname, 'pages/reviews.html'),
      },
    },
  },
}))

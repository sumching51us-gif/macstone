import Layout from '@/layout/index.vue'

export default [
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/dashboard/index.vue')
      }
    ]
  },
  {
    path: '/image',
    component: Layout,
    redirect: '/image/index',
    children: [
      {
        path: 'index',
        name: 'image-root',
        component: () => import('@/views/image/ImageRoot.vue')
      },
      {
        path: 'compare',
        name: 'image-compare',
        component: () => import('@/views/image/ImageCompare.vue')
      },
      {
        path: 'single',
        name: 'image-single',
        component: () => import('@/views/image/SingleView.vue')
      }
    ]
  },
  {
    path: '/video',
    component: Layout,
    redirect: '/video/index',
    children: [
      {
        path: 'index',
        name: 'video-root',
        component: () => import('@/views/video/VideoRoot.vue')
      },
      {
        path: 'compare',
        name: 'video-compare',
        component: () => import('@/views/video/VideoCompare.vue')
      }
    ]
  }
]

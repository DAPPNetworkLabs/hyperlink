import DashboardLayout from '../layout/DashboardLayout.vue'
// GeneralViews
import NotFound from '../pages/NotFoundPage.vue'

// Admin pages
import Overview from 'src/pages/Overview.vue'
import UserProfile from 'src/pages/UserProfile.vue'
import Log from 'src/pages/Log.vue'
import Editor from 'src/pages/Editor.vue'
import Processes from 'src/pages/Processes.vue'

const routes = [
  {
    path: '/',
    component: DashboardLayout,
    redirect: '/admin/overview'
  },
  {
    path: '/admin',
    component: DashboardLayout,
    redirect: '/admin/overview',
    children: [
      {
        path: 'overview',
        name: 'Overview',
        component: Overview
      },
      {
        path: 'dspprofile',
        name: 'DSP Profile',
        component: UserProfile
      },      
      {
        path: 'event-log',
        name: 'Event Log',
        component: Log
      },
      {
        path: 'processes',
        name: 'Processes',
        component: Processes
      },
      {
        path: 'packages',
        name: 'Packages',
        component: Processes
      },
      {
        path: 'editor',
        name: 'Editor',
        component: Editor
      },
      {
        path: 'config',
        name: 'Configuration',
        component: Log
      }
    ]
  },
  { path: '*', component: NotFound }
]

/**
 * Asynchronously load view (Webpack Lazy loading compatible)
 * The specified component must be inside the Views folder
 * @param  {string} name  the filename (basename) of the view to load.
function view(name) {
   var res= require('../components/Dashboard/Views/' + name + '.vue');
   return res;
};**/

export default routes

<template>
  <div class="wrapper">
    <side-bar>
      <mobile-menu slot="content"></mobile-menu>
      <sidebar-link to="/admin/overview">
        <i class="fa fa-camera-retro"></i>
        <p>Dashboard</p>
      </sidebar-link>
      <sidebar-link to="/admin/event-log">
        <i class="fa fa-camera-retro"></i>
        <p>Event Log</p>
      </sidebar-link>
      <sidebar-link to="/admin/processes">
        <i class="fa fa-camera-retro"></i>
        <p>Processes</p>
      </sidebar-link>
      <sidebar-link to="/admin/editor">
        <i class="fa fa-camera-retro"></i>
        <p>Editor</p>
      </sidebar-link>
      <sidebar-link to="/admin/config">
        <i class="fa fa-camera-retro"></i>
        <p>Config</p>
      </sidebar-link>
      <sidebar-link to="/admin/dspprofile">
        <i class="fa fa-camera-retro"></i>
        <p>DSP Profile</p>
      </sidebar-link>
      <sidebar-link to="/admin/packages">
        <i class="fa fa-camera-retro"></i>
        <p>Packages</p>
      </sidebar-link>
      <template slot="bottom-links">

      </template>
    </side-bar>
    <div class="main-panel">
      <top-navbar></top-navbar>

      <dashboard-content @click="toggleSidebar">

      </dashboard-content>

      <content-footer></content-footer>
    </div>
  </div>
</template>
<style lang="scss">

</style>
<script>
  import TopNavbar from './TopNavbar.vue'
  import ContentFooter from './ContentFooter.vue'
  import DashboardContent from './Content.vue'
  import MobileMenu from './MobileMenu.vue'
  export default {
    components: {
      TopNavbar,
      ContentFooter,
      DashboardContent,
      MobileMenu
    },
    methods: {
      toggleSidebar () {
        if (this.$sidebar.showSidebar) {
          this.$sidebar.displaySidebar(false)
        }
      }
    }
  }

</script>

import Boostrap from './vendor/bootstrap.js'
import VueRouter from 'vue-router'
import Vue from 'vue'
import NewQuery from './components/NewQuery.vue'
import ViewQuery from './components/ViewQuery.vue'
import EditQuery from './components/EditQuery.vue'

Vue.use(VueRouter);

var App = Vue.extend({});
var router = new VueRouter({
  hashbang: false
});

router.map({
    '/': {
        component: NewQuery,
        name : "new"
    },
    '/view/:type/:slug' : {
      component: ViewQuery,
      name: 'view'
    },
    '/edit/:type/:slug' : {
      component: EditQuery,
      name: 'edit'
    }
});
router.mode = 'html5';
router.redirect({
  '*': '/'
})


router.start(App, '#app');

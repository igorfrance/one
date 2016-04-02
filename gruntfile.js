module.exports = function(grunt)
{
  grunt.initConfig(
  {
	  pkg: grunt.file.readJSON('package.json'),

	  less:
	  {
		  main:
		  {
	      files:
	      {
	        "dist/controls/scroller.css": "src/controls/scroller/scroller.less",
	        "dist/controls/slider.css": "src/controls/slider/slider.less",
	        "dist/controls/tooltip.css": "src/controls/tooltip/tooltip.less"
		    }
		  }
	  },

	  preprocess:
	  {
			options:
			{
		    context: { DEBUG: true }
      },
		  one_js:
		  {
		    src: 'src/one.js',
        dest: 'dist/one.js'
		  },
		  one_controls:
		  {
		    files:
		    {
			    'dist/one.controls.js': 'src/one.controls.js',
			    'dist/controls/slider.js': 'src/controls/slider/slider.js',
			    'dist/controls/tooltip.js': 'src/controls/tooltip/tooltip.js',
			    'dist/controls/scroller.js': 'src/controls/scroller/scroller.js',
			    'dist/controls/flexstrip.js': 'src/controls/flexstrip/flexstrip.js'
		    }
		  },
		  one_css:
		  {
		    src: ['dist/controls/*.css'],
		    dest: 'dist/one.controls.css',
			  options: { inline: true  }
		  }
	  },

	  uglify:
	  {
		  one_js:
		  {
		    src: 'dist/one.js',
        dest: 'dist/one.min.js'
		  },
		  one_controls:
		  {
		    files:
		    {
			    'dist/one.controls.min.js': 'dist/one.controls.js',
			    'dist/controls/slider.min.js': 'dist/controls/slider.js',
			    'dist/controls/tooltip.min.js': 'dist/controls/tooltip.js',
			    'dist/controls/scroller.min.js': 'dist/controls/scroller.js',
			    'dist/controls/flexstrip.min.js': 'dist/controls/flexstrip.js'
		    }
		  }
	  },

	  cssmin:
	  {
		  one_controls:
		  {
		    src: 'dist/one.controls.css',
        dest: 'dist/one.controls.min.css'
		  }
	  },

	  watch:
	  {
		  one_js:
		  {
			  files: ['src/core/*.js', 'src/utils/*.js', 'src/controls/*.js', 'src/one.js'],
			  tasks: ['preprocess:one_js']
		  },
		  one_controls:
		  {
			  files: ['src/controls/**/*.js', 'src/one.controls.js'],
			  tasks: ['preprocess:one_controls']
		  },
		  css:
		  {
			  files: ['src/controls/**/*.less'],
			  tasks: ['less', 'preprocess:one_css']
		  }
	  }
  });

  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-preprocess');

  grunt.registerTask('build', ['less', 'preprocess', 'uglify', 'cssmin']);
  grunt.registerTask('default', ['build', 'watch']);
};

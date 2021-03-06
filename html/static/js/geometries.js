let GEOMETRY = {
	DEVICE: {
		UNKNOWN: {
			base_scale: [1, 1, 1],
			subshapes: [{
				"flat_normals": true,
				"texture": "basic.png",
				"color": 0x488eee,
				"is_texture_light": true,
				elements: [{
					type: "vertex_list",
					v: [[-.3, .6, .3], [.3, .6, .3], [.3, .6, -.3], [-.3, .6, -.3], [-.3, 0, .3], [.3, 0, .3], [.3, 0, -.3], [-.3, 0, -.3]],
					f: [[4,6,5], [4,7,6],[0,4,5], [0,5,1],[1,5,6], [1,6,2],[2,6,7], [2,7,3],[3,7,4], [3,4,0], [0,1,2], [0,2,3]],
					uv: [[[0,0], [1,1], [1,0]], [[0,0], [0,1], [1,1]],[[0,0], [0,1], [1,1]], [[0,0], [1,1], [1,0]],[[0,0], [0,1], [1,1]], [[0,0], [1,1], [1,0]],[[0,0], [0,1], [1,1]], [[0,0], [1,1], [1,0]],[[0,0], [0,1], [1,1]], [[0,0], [1,1], [1,0]],[[0,0], [0,1], [1,1]], [[0,0], [1,1], [1,0]]],
				}],
			}],
		},
	},
	SYMBOL: {
		UNKNOWN: {
			base_scale: [1, 1, 1],
			subshapes: [{
				"flat_normals": true,
				"texture": "basic.png",
				"color": 0x488eee,
				"is_texture_light": true,
				elements: [{
					type: "vertex_list",
					v: [[-.3, 6, .3], [.3, .6, .3], [.3, .6, -.3], [-.3, .6, -.3], [-.3, 0, .3], [.3, 0, .3], [.3, 0, -.3], [-.3, 0, -.3]],
					f: [[4,6,5], [4,7,6],[0,4,5], [0,5,1],[1,5,6], [1,6,2],[2,6,7], [2,7,3],[3,7,4], [3,4,0], [0,1,2], [0,2,3]],
					uv: [[[0,0], [1,1], [1,0]], [[0,0], [0,1], [1,1]],[[0,0], [0,1], [1,1]], [[0,0], [1,1], [1,0]],[[0,0], [0,1], [1,1]], [[0,0], [1,1], [1,0]],[[0,0], [0,1], [1,1]], [[0,0], [1,1], [1,0]],[[0,0], [0,1], [1,1]], [[0,0], [1,1], [1,0]],[[0,0], [0,1], [1,1]], [[0,0], [1,1], [1,0]]],
				}],
			}],
		},
		X: {
			base_scale: [1,1,1],
			subshapes: [{
				"flat_normals": true,
				"texture": "basic.png",
				"color": 0x488eee,
				"is_texture_light": true,
				elements: [{
					type: "vertex_list",
					v: [
							[-.5,.9,.1],  [-.4,1,.1],  [.4,1,.1],  [.5,.9,.1],  [.5,.1,.1],  [.4,0,.1],  [-.4,0,.1],  [-.5,.1,.1],
							[-.5,.9,-.1], [-.4,1,-.1], [.4,1,-.1], [.5,.9,-.1], [.5,.1,-.1], [.4,0,-.1], [-.4,0,-.1], [-.5,.1,-.1],
					],
					f: [
							[0,4,1], [0,5,4], [2,6,3], [2,7,6],
							[8,9,12], [8,12,13], [10,11,14], [10,14,15],
							[0,9,8], [0,1,9], [1,4,12], [1,12,9], [4,5,13], [4,13,12], [5,0,8], [5,8,13],
							[2,11,10], [2,3,11], [3,6,14], [3,14,11], [6,7,15], [6,15,14], [7,2,10], [7,10,15]
					],
					uv: [
						[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],
						[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],
						[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],
						[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],
						[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],
						[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],
					],
				}],
			}],
		},
		V: {
			base_scale: [1,1,1],
			subshapes: [{
				"flat_normals": true,
				"texture": "basic.png",
				"color": 0x488eee,
				"is_texture_light": true,
				elements: [{
					type: "vertex_list",
					v: [
							[-.5,.6,.1],  [-.3,.6,.1],  [.3,1,.1],  [.5,1,.1],  [.1,0,.1],  [-.1,0,.1],  [.1,0,.1],  [-.1,0,.1],
							[-.5,.6,-.1], [-.3,.6,-.1], [.3,1,-.1], [.5,1,-.1], [.1,0,-.1], [-.1,0,-.1], [.1,0,-.1], [-.1,0,-.1],
					],
					f: [
							[0,4,1], [0,5,4], [2,6,3], [2,7,6],
							[8,9,12], [8,12,13], [10,11,14], [10,14,15],
							[0,9,8], [0,1,9], [1,4,12], [1,12,9], [4,5,13], [4,13,12], [5,0,8], [5,8,13],
							[2,11,10], [2,3,11], [3,6,14], [3,14,11], [6,7,15], [6,15,14], [7,2,10], [7,10,15]
					],
					uv: [
						[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],
						[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],
						[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],
						[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],
						[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],
						[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],
					],
				}],
			}],
		},
		F: {
			base_scale: [1,1,1],
			subshapes: [
				{
					"flat_normals": true,
					"texture": "basic.png",
					"color": 0x488eee,
					"is_texture_light": true,
					elements: [{
						type: "vertex_list",
						v: [
								[0,0,.2], [.2,0,0], [0,0,-.2], [-.2,0,0],
								[0,.1,.07], [.07,.1,0], [0,.1,-.07], [-.07,.1,0],
								[0,1,.07], [.07,1,0], [0,1,-.07], [-.07,1,0],
								[0,1.2,0]
						],
						f: [
								[0,2,1], [0,3,2],
								[0,1,5], [0,5,4], [1,2,6],[1,6,5], [2,3,7],[2,7,6], [3,0,4],[3,4,7],
								[4,5,9], [4,9,8], [5,6,10],[5,10,9], [6,7,11],[6,11,10], [7,4,8],[7,8,11],
								[8,9,12], [9,10,12],[10,11,12], [11,8,12],
						],
						uv: [
							[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],
							[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],
							[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],
							[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],
							[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],
							[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],
						],
					}],
				},
				{
					"flat_normals": true,
					"texture": "basic.png",
					"color": 0x206cc0,
					"is_texture_light": true,
					elements: [{
						type: "vertex_list",
						v: [
								[.07,1,.05], [1, 1, .05], [1, .5, .05], [.07, .5, .05],
								[.07,1,-.05], [1, 1, -.05], [1, .5, -.05], [.07, .5, -.05],			
						],
						f: [
								[0,2,1], [0,3,2],
								[4,5,6], [4,6,7],
								[0,1,5], [0,5,4], [1,2,6],[1,6,5], [2,3,7],[2,7,6], [3,0,4],[3,4,7],
						],
						uv: [
							[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],
							[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],
							[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],
							[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],[[0,0],[0,0],[0,0]],
						],
					}],
				},
			],
		},
	}
}
// Generated directional arm and rear gait contract (walk v0.6).
export const FOX_RIG={
  "version": "0.6.0",
  "canvas": {
    "width": 1280,
    "height": 1280,
    "origin": [
      660,
      1180
    ],
    "unitsPerPixel": 0.48
  },
  "headPivot": {
    "x": 9.6,
    "y": 218.4
  },
  "targets": {
    "left": {
      "ankle": {
        "x": -28.718091363467167,
        "y": 24
      },
      "toe": {
        "x": -2.718091363467167,
        "y": 12
      }
    },
    "right": {
      "ankle": {
        "x": 55.376730387667905,
        "y": 24
      },
      "toe": {
        "x": 81.3767303876679,
        "y": 12
      }
    }
  },
  "worldUnitsPerSpineUnit": 0.0059375,
  "source": {
    "size": 1024,
    "halfHeight": 409.6,
    "center": 280,
    "worldSize": 4.864,
    "bottom": -0.6445
  },
  "walkDuration": 0.6,
  "stride": 0.48,
  "skins": {
    "front": [
      "fox/front",
      "gear/scarf-front",
      "gear/sword-front"
    ],
    "back": [
      "fox/back",
      "gear/scarf-back",
      "gear/sword-back"
    ]
  },
  "dyeSlots": [
    "scarf"
  ],
  "pawArt": "forward-facing relaxed feet",
  "bodyRegions": {
    "front": {
      "path": "body-front",
      "x": 10,
      "y": 108.5,
      "width": 163.659375,
      "height": 253,
      "paws": [
        {
          "x": -28.718091363467167,
          "y": 24.527083333333337
        },
        {
          "x": 55.376730387667905,
          "y": 26.635416666666657
        }
      ],
      "pixels": {
        "width": 621,
        "height": 960
      },
      "layers": {
        "torso": {
          "path": "walk-torso-front",
          "x": 9.868229166666667,
          "y": 145.659375,
          "width": 162.86875,
          "height": 178.68125
        },
        "left": {
          "path": "walk-left-front",
          "x": -29.135937500000004,
          "y": 57.241145833333334,
          "width": 85.3875,
          "height": 150.48229166666667
        },
        "right": {
          "path": "walk-right-front",
          "x": 52.69375,
          "y": 57.9,
          "width": 78.27187500000001,
          "height": 149.16458333333333
        }
      }
    },
    "back": {
      "path": "body-back",
      "x": 10,
      "y": 108.5,
      "width": 148.90104166666666,
      "height": 253,
      "paws": [
        {
          "x": -29.631954800194933,
          "y": 24.527083333333337
        },
        {
          "x": 42.34800546042207,
          "y": 24.527083333333337
        }
      ],
      "pixels": {
        "width": 565,
        "height": 960
      },
      "layers": {
        "torso": {
          "path": "walk-torso-back",
          "x": 8.0234375,
          "y": 179.2609375,
          "width": 136.51458333333332,
          "height": 111.478125
        },
        "left": {
          "path": "walk-left-back",
          "x": -29.004166666666663,
          "y": 57.241145833333334,
          "width": 70.89270833333333,
          "height": 150.48229166666667
        },
        "right": {
          "path": "walk-right-back",
          "x": 45.446354166666666,
          "y": 57.241145833333334,
          "width": 78.00833333333333,
          "height": 150.48229166666667
        }
      }
    }
  },
  "flatWalkPreview": {
    "animation": "walk-preview",
    "duration": 0.6,
    "speed": 0.8,
    "stride": 0.48
  },
  "terrainOffsetBones": [
    "ground-left",
    "ground-right"
  ],
  "armArt": {
    "front": [
      "arm-front-left",
      "arm-front-right"
    ],
    "back": [
      "arm-back-left",
      "arm-back-right"
    ],
    "sword": "fox-sword-clean"
  },
  "walkClips": {
    "side": "walk",
    "away": "walk-back",
    "toward": "walk-front"
  }
} as const;

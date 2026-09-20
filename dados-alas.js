/* ============================================================
   DADOS DAS ALAS  —  este é o único arquivo que você precisa trocar.

   Como usar:
   1. Obtenha os limites reais de cada ala em formato GeoJSON
      (veja as instruções no chat / README).
   2. Substitua TODO o conteúdo depois de "const ALAS_GEOJSON =" pelo
      seu GeoJSON (um "Feature" do tipo Polygon ou MultiPolygon por ala).
   3. Em cada Feature, deixe as propriedades assim:
        "properties": { "nome": "Ala Fortaleza", "cor": "#FF6F61" }
   4. Apague a linha  "exemplo": true  para o aviso vermelho sumir.

   ATENÇÃO: os polígonos abaixo são apenas um EXEMPLO desenhado
   a olho a partir de uma imagem. NÃO use com os membros.
   ============================================================ */
const ALAS_GEOJSON = {
 "type": "FeatureCollection",
 "exemplo": true,
 "features": [
  {
   "type": "Feature",
   "properties": {
    "nome": "Ala Castelo",
    "cor": "#F5E663"
   },
   "geometry": {
    "type": "Polygon",
    "coordinates": [
     [
      [
       -38.523511,
       -3.835325
      ],
      [
       -38.519531,
       -3.829627
      ],
      [
       -38.514621,
       -3.824327
      ],
      [
       -38.507587,
       -3.824327
      ],
      [
       -38.503208,
       -3.829098
      ],
      [
       -38.513559,
       -3.830025
      ],
      [
       -38.515151,
       -3.840625
      ],
      [
       -38.519531,
       -3.839698
      ],
      [
       -38.523511,
       -3.835325
      ]
     ]
    ]
   }
  },
  {
   "type": "Feature",
   "properties": {
    "nome": "Ala Fortaleza",
    "cor": "#FF6F61"
   },
   "geometry": {
    "type": "Polygon",
    "coordinates": [
     [
      [
       -38.515151,
       -3.830025
      ],
      [
       -38.50626,
       -3.829627
      ],
      [
       -38.502943,
       -3.83135
      ],
      [
       -38.500289,
       -3.837312
      ],
      [
       -38.500289,
       -3.84195
      ],
      [
       -38.505597,
       -3.843938
      ],
      [
       -38.508251,
       -3.847913
      ],
      [
       -38.512895,
       -3.845263
      ],
      [
       -38.515151,
       -3.839962
      ],
      [
       -38.515151,
       -3.830025
      ]
     ]
    ]
   }
  },
  {
   "type": "Feature",
   "properties": {
    "nome": "Ala Messejana",
    "cor": "#EE4DA6"
   },
   "geometry": {
    "type": "Polygon",
    "coordinates": [
     [
      [
       -38.513559,
       -3.824063
      ],
      [
       -38.512895,
       -3.817438
      ],
      [
       -38.507587,
       -3.814125
      ],
      [
       -38.500289,
       -3.802863
      ],
      [
       -38.496308,
       -3.803525
      ],
      [
       -38.491664,
       -3.810548
      ],
      [
       -38.47773,
       -3.812137
      ],
      [
       -38.476138,
       -3.825122
      ],
      [
       -38.481446,
       -3.840625
      ],
      [
       -38.48901,
       -3.844865
      ],
      [
       -38.495644,
       -3.840625
      ],
      [
       -38.498962,
       -3.832675
      ],
      [
       -38.503606,
       -3.828038
      ],
      [
       -38.513559,
       -3.824063
      ]
     ]
    ]
   }
  },
  {
   "type": "Feature",
   "properties": {
    "nome": "Ala Palmeiras",
    "cor": "#3FC8F0"
   },
   "geometry": {
    "type": "Polygon",
    "coordinates": [
     [
      [
       -38.526165,
       -3.83665
      ],
      [
       -38.515151,
       -3.840625
      ],
      [
       -38.513559,
       -3.846588
      ],
      [
       -38.516213,
       -3.851888
      ],
      [
       -38.51754,
       -3.859838
      ],
      [
       -38.516877,
       -3.867787
      ],
      [
       -38.522848,
       -3.870437
      ],
      [
       -38.541691,
       -3.888723
      ],
      [
       -38.53771,
       -3.866462
      ],
      [
       -38.533464,
       -3.854538
      ],
      [
       -38.532137,
       -3.848575
      ],
      [
       -38.530147,
       -3.842612
      ],
      [
       -38.526165,
       -3.83665
      ]
     ]
    ]
   }
  },
  {
   "type": "Feature",
   "properties": {
    "nome": "Ala Parque Verde",
    "cor": "#8A78D0"
   },
   "geometry": {
    "type": "Polygon",
    "coordinates": [
     [
      [
       -38.508516,
       -3.8446
      ],
      [
       -38.505597,
       -3.843673
      ],
      [
       -38.499626,
       -3.842348
      ],
      [
       -38.495644,
       -3.8446
      ],
      [
       -38.498962,
       -3.850563
      ],
      [
       -38.50427,
       -3.858513
      ],
      [
       -38.510905,
       -3.865137
      ],
      [
       -38.516877,
       -3.868053
      ],
      [
       -38.516213,
       -3.859838
      ],
      [
       -38.515549,
       -3.851888
      ],
      [
       -38.513559,
       -3.846588
      ],
      [
       -38.508516,
       -3.8446
      ]
     ]
    ]
   }
  }
 ]
};

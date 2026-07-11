// Componente de formulario de maquinaria. Sirve tanto para crear una
// nueva maquinaria como para editar una existente, dependiendo de si
// se recibe un ID en la ruta.
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Api } from '../../core/services/api';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-machinery-form', templateUrl: './form.html', styleUrls: ['./form.css'],
  standalone: false
})
export class MachineryForm implements OnInit {
  isEdit = false; loading = false; error = '';
  photos: { file: File; preview: string }[] = [];
  isDragging = false;
  data: any = {
    titulo:'', descripcion:'', tipo:'', marca:'', modelo:'', anio:null,
    capacidad:'', capacidad_unidad:'toneladas', estado:'bueno', precio_por_dia:null, precio_por_hora:null,
    ubicacion_lat:null, ubicacion_lng:null, direccion:'', ciudad:'', departamento:''
  };

  machineryTypes = ['Excavadora', 'Retroexcavadora', 'Bulldozer', 'Grúa', 'Montacargas', 'Volqueta', 'Compactadora', 'Motoniveladora', 'Cargador frontal', 'Tractor', 'Minicargador', 'Vibrocompactador', 'Camión grúa', 'Barredora', 'Desbrozadora', 'Martillo hidráulico', 'Zanjadora', 'Perforadora', 'Planta de asfalto', 'Mezcladora de concreto'];
  capacidadUnidades = ['toneladas', 'kilos', 'litros', 'metros cúbicos', 'metros', 'caballos de fuerza', 'libras'];

  departamentos = ['Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá', 'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda', 'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada'];

  colombiaData: any[] = [
    {"departamento":"Amazonas","ciudades":["Leticia","Puerto Nariño"]},
    {"departamento":"Antioquia","ciudades":["Medellín","Bello","Envigado","Itagüí","Rionegro","Apartadó","Turbo","Barbosa","Caldas","Copacabana","Girardota","Sabaneta","La Estrella","Marinilla","Carmen de Viboral","Cañasgordas","Chigorodó","Caucasia","Segovia","Yarumal","Amagá","Andes","Jardín","Jericó","Santa Fe de Antioquia","Támesis","Ciudad Bolívar","San Pedro de los Milagros","La Ceja","El Retiro","El Carmen de Viboral","El Santuario","Granada","Guarne","Guatapé","San Carlos","San Rafael","San Roque","San Vicente","Sopetrán","Yolombó","Zaragoza"]},
    {"departamento":"Arauca","ciudades":["Arauca","Saravena","Tame","Arauquita","Puerto Rondón","Fortul","Cravo Norte"]},
    {"departamento":"Atlántico","ciudades":["Barranquilla","Soledad","Malambo","Puerto Colombia","Galapa","Baranoa","Sabanalarga","Luruaco","Campo de la Cruz","Candelaria","Juan de Acosta","Manatí","Palmar de Varela","Piojó","Polonuevo","Ponedera","Repelón","Sabanagrande","Santa Lucía","Santo Tomás","Suán","Tubará","Usiacurí"]},
    {"departamento":"Bolívar","ciudades":["Cartagena de Indias","Magangué","El Carmen de Bolívar","Turbaco","Arjona","Mompós","San Pablo","Santa Rosa","Santa Catalina","San Jacinto","San Juan Nepomuceno","María la Baja","Mahates","Calamar","El Guamo","Villanueva","Zambrano","Clemencia","Córdoba","Hatillo de Loba","Margarita","Montecristo","Morales","Norosí","Pinillos","Regidor","Río Viejo","San Estanislao","San Fernando","San Martín de Loba","Simití","Soplaviento","Talaigua Nuevo","Tiquisio","Turbaná","Altos del Rosario","Arenal","Barranco de Loba","Cantagallo","Cicuco","El Peñón","San Cristóbal","San Jacinto del Cauca","Santa Rosa del Sur","Turbaco"]},
    {"departamento":"Boyacá","ciudades":["Tunja","Duitama","Sogamoso","Chiquinquirá","Paipa","Soatá","Ramiriquí","Villa de Leyva","Garagoa","Miraflores","Moniquirá","Nobsa","Puerto Boyacá","Samacá","Santa Rosa de Viterbo","Tibasosa","Sutamarchán","Chita","Guateque","Socotá","Socha","Paz del Río","Belén","Boavita","Chiscas","Cubará","El Cocuy","Gámeza","La Uvita","Mongua","Monguí","Otanche","Pajarito","Paya","Pesca","Ráquira","Saboyá","Sáchica","San Luis de Gaceno","San Mateo","Santa María","Sativanorte","Sativasur","Siachoque","Sora","Soracá","Susacón","Tasco","Tenza","Tibaná","Toca","Togüí","Tuta","Turmequé","Ventaquemada","Viracachá","Zetaquira","Aquitania","Arcabuco","Berbeo","Buenavista","Caldas","Chíquiza","Chivor","Ciénega","Cómbita","Coper","Corrales","Cucaita","Cuítiva","El Espino","Firavitoba","Floresta","Gachantivá","Guacamayas","Guayatá","Jenesano","La Capilla","Labranzagrande","Macanal","Maripí","Motavita","Muzo","Nuevo Colón","Oicatá","Pachavita","Páez","Panqueba","Pauna","Pisba","Quípama","Rondón","San Eduardo","San José de Pare","San Miguel de Sema","San Pablo de Borbur","Santana","Somondoco","Sotaquirá","Sutatenza","Tipacoque","Tópaga","Tota","Tununguá","Tutazá","Úmbita"]},
    {"departamento":"Caldas","ciudades":["Manizales","La Dorada","Chinchiná","Salamina","Anserma","Aguadas","Riosucio","Aranzazu","Manzanares","Neira","Palestina","Pensilvania","Villamaría","Belalcázar","Filadelfia","La Merced","Marmato","Marquetalia","Marulanda","Norcasia","Pácora","Risaralda","Samaná","San José","Supía","Victoria","Viterbo"]},
    {"departamento":"Caquetá","ciudades":["Florencia","San Vicente del Caguán","Cartagena del Chairá","El Doncello","La Montañita","Puerto Rico","Belén de los Andaquíes","Curillo","El Paujil","Milán","Morelia","San José del Fragua","Solano","Solita","Valparaíso","Albania"]},
    {"departamento":"Casanare","ciudades":["Yopal","Aguazul","Villanueva","Paz de Ariporo","Tauramena","Monterrey","Maní","Orocué","San Luis de Palenque","Chámeza","Hato Corozal","La Salina","Nunchía","Pore","Recetor","Sabanalarga","Sácama","Támara","Trinidad"]},
    {"departamento":"Cauca","ciudades":["Popayán","Santander de Quilichao","Puerto Tejada","Patía","Caldono","Miranda","Corinto","El Tambo","Guachené","Piendamó","Silvia","Suárez","Balboa","Bolívar","Buenos Aires","Cajibío","Caloto","Florencia","Guapí","Inzá","Jambaló","La Sierra","La Vega","López de Micay","Mercaderes","Morales","Padilla","Páez","Piamonte","Puracé","Rosas","San Sebastián","Santa Rosa","Sotará","Sucre","Timbío","Timbiquí","Toribío","Totoró","Villa Rica","Almaguer","Argelia"]},
    {"departamento":"Cesar","ciudades":["Valledupar","Aguachica","Codazzi","Bosconia","San Diego","La Paz","San Alberto","San Martín","Curumaní","Chiriguaná","El Copey","Gamarra","La Jagua de Ibirico","Pailitas","Pelaya","Río de Oro","Astrea","Becerril","Chimichagua","El Paso","González","La Gloria","Manaure","Pueblo Bello","Tamalameque"]},
    {"departamento":"Chocó","ciudades":["Quibdó","Istmina","Condoto","Bahía Solano","Nuquí","Acandí","Juradó","Riosucio","Carmen del Darién","Unguía","Alto Baudó","Bagadó","Bajo Baudó","Bojayá","Cantón de San Pablo","Cértegui","El Atrato","El Carmen de Atrato","Litoral de San Juan","Lloró","Medio Atrato","Medio Baudó","Medio San Juan","Nóvita","Río Iró","Río Quito","San José del Palmar","Sipí","Tadó","Unión Panamericana"]},
    {"departamento":"Cundinamarca","ciudades":["Bogotá","Soacha","Facatativá","Zipaquirá","Chía","Madrid","Funza","Mosquera","Girardot","Fusagasugá","Cajicá","Sibaté","Tocancipá","Cota","La Mesa","Ubaté","Villeta","Pacho","Agua de Dios","Anapoima","Apulo","Arbeláez","Beltrán","Bituima","Bojacá","Cabrera","Cachipay","Caparrapí","Cáqueza","Carmen de Carupa","Chaguaní","Chipaque","Choachí","Chocontá","Cogua","Cucunubá","El Colegio","El Peñón","El Rosal","Fómeque","Fosca","Fúquene","Gachalá","Gachancipá","Gachetá","Gama","Granada","Guachetá","Guaduas","Guasca","Guataquí","Guatavita","Guayabal de Síquima","Guayabetal","Gutiérrez","Jerusalén","Junín","La Calera","La Palma","La Peña","La Vega","Lenguazaque","Machetá","Manta","Medina","Nariño","Nemocón","Nilo","Nimaima","Nocaima","Paime","Pandi","Paratebueno","Pasca","Puerto Salgar","Pulí","Quebradanegra","Quetame","Quipile","Ricaurte","San Antonio del Tequendama","San Bernardo","San Cayetano","San Francisco","San Juan de Rioseco","Sasaima","Sesquilé","Silvania","Simijaca","Sopó","Subachoque","Suesca","Supatá","Susa","Sutatausa","Tabio","Tausa","Tena","Tenjo","Tibacuy","Tibirita","Tocaima","Topaipí","Ubalá","Ubaque","Sopó","Une","Útica","Venecia","Vergara","Vianí","Villagómez","Villapinzón","Viotá","Yacopí","Zipacón"]},
    {"departamento":"Córdoba","ciudades":["Montería","Cereté","Sahagún","Lorica","Tierralta","Planeta Rica","Chinú","San Pelayo","Montelíbano","Ciénaga de Oro","Ayapel","Buenavista","Canalete","Chimá","Cotorra","La Apartada","Los Córdobas","Momil","Moñitos","Pueblo Nuevo","Puerto Escondido","Puerto Libertador","Purísima","San Andrés de Sotavento","San Antero","San Bernardo del Viento","San Carlos","San José de Uré","Tuchín","Valencia"]},
    {"departamento":"Guainía","ciudades":["Inírida"]},
    {"departamento":"Guaviare","ciudades":["San José del Guaviare","Calamar","El Retorno","Miraflores"]},
    {"departamento":"Huila","ciudades":["Neiva","Pitalito","Garzón","La Plata","Campoalegre","San Agustín","Palermo","Gigante","Aipe","Algeciras","Baraya","Colombia","Elías","Guadalupe","Hobo","Íquira","Isnos","La Argentina","Nátaga","Oporapa","Paicol","Palestina","Rivera","Saladoblanco","Santa María","Suaza","Tarqui","Tello","Teruel","Tesalia","Timaná","Villavieja","Yaguará","Acevedo","Agrado","Altamira"]},
    {"departamento":"La Guajira","ciudades":["Riohacha","Maicao","Uribia","Fonseca","San Juan del Cesar","Barrancas","Dibulla","Distracción","El Molino","Hatonuevo","La Jagua del Pilar","Manaure","Urumita","Villanueva","Albania"]},
    {"departamento":"Magdalena","ciudades":["Santa Marta","Ciénga","Fundación","El Banco","Plato","Aracataca","Zona Bananera","Algarrobo","Ariguaní","Cerro de San Antonio","Chivolo","Concordia","El Piñón","El Retén","Guamal","Nueva Granada","Pedraza","Pijiño del Carmen","Pivijay","Pueblo Viejo","Remolino","Sabanas de San Ángel","Salamina","San Sebastián de Buenavista","San Zenón","Santa Ana","Santa Bárbara de Pinto","Sitionuevo","Tenerife","Zapayán"]},
    {"departamento":"Meta","ciudades":["Villavicencio","Acacías","Granada","Puerto López","San Martín","Cumaral","Puerto Gaitán","Restrepo","San Carlos de Guaroa","Barranca de Upía","Cabuyaro","Castilla la Nueva","Cubarral","El Calvario","El Castillo","El Dorado","Fuente de Oro","Guamal","La Macarena","La Uribe","Lejanías","Mapiripán","Mesetas","Puerto Concordia","Puerto Lleras","Puerto Rico","San Juan de Arama","San Juanito","Vista Hermosa"]},
    {"departamento":"Nariño","ciudades":["Pasto","Tumaco","Ipiales","Barbacoas","La Unión","Cumbal","Samaniego","Túquerres","El Tambo","Chachagüí","Sandona","Buesaco","Francisco Pizarro","Funes","Guachucal","Guaitarilla","Gualmatán","Iles","Imués","La Cruz","La Florida","La Llanada","La Tola","Leiva","Linares","Los Andes","Magüí Payán","Mallama","Mosquera","Nariño","Olaya Herrera","Ospina","Policarpa","Potosí","Providencia","Puerres","Pupiales","Ricaurte","Roberto Payán","San Bernardo","San José de Albán","San Lorenzo","San Pablo","San Pedro de Cartago","Santa Bárbara","Santacruz","Sapuyes","Taminango","Tangua","Yacuanquer","Aldana","Ancuyá","Arboleda","Belén","Colón","Consacá","Contadero","Córdoba","Cuaspud","Cumbitara","El Charco","El Peñol","El Rosario","El Tablón"]},
    {"departamento":"Norte de Santander","ciudades":["Cúcuta","Ocaña","Pamplona","Los Patios","Villa del Rosario","San Cayetano","Chinácota","Ábrego","Arboledas","Bochalema","Bucarasica","Cáchira","Cácota","Chitagá","Convención","Cucutilla","Duranía","El Carmen","El Tarra","El Zulia","Gramalote","Hacarí","Herrán","La Esperanza","La Playa de Belén","Labateca","Lourdes","Mutiscua","Pamplonita","Puerto Santander","Ragonvalia","Salazar de Las Palmas","San Calixto","Santiago","Santo Domingo de Silos","Sardinata","Teorama","Tibú","Toledo","Villa Caro"]},
    {"departamento":"Putumayo","ciudades":["Mocoa","Puerto Asís","Orito","San Miguel","Puerto Guzmán","Puerto Leguízamo","Sibundoy","Colón","Santiago","Valle del Guamuez","Villagarzón","San Francisco","Puerto Caicedo"]},
    {"departamento":"Quindío","ciudades":["Armenia","Calarcá","Montenegro","La Tebaida","Quimbaya","Circasia","Salento","Filandia","Buenavista","Córdoba","Génova","Pijao"]},
    {"departamento":"Risaralda","ciudades":["Pereira","Dosquebradas","Santa Rosa de Cabal","La Virginia","Marsella","Quinchía","Santuario","Apía","Balboa","Belén de Umbría","Guática","La Celia","Mistrató","Pueblo Rico"]},
    {"departamento":"San Andrés y Providencia","ciudades":["San Andrés","Providencia y Santa Catalina Islas"]},
    {"departamento":"Santander","ciudades":["Bucaramanga","Floridablanca","Barrancabermeja","Girón","Piedecuesta","San Gil","Socorro","Lebrija","Málaga","Barbosa","Vélez","Puente Nacional","San Vicente de Chucurí","Cimitarra","Puerto Wilches","Sabana de Torres","Aguada","Albania","Aratoca","Barichara","Betulia","Bolívar","Cabrera","California","Capitanejo","Carcasí","Cepitá","Cerrito","Charalá","Charta","Chima","Chipatá","Concepción","Confines","Contratación","Coromoro","Curití","El Carmen de Chucurí","El Guacamayo","El Peñón","El Playón","Encino","Enciso","Florián","Galán","Gámbita","Guaca","Guadalupe","Guapotá","Guavatá","Güepsa","Hato","Jesús María","Jordán","La Belleza","La Paz","Landázuri","Los Santos","Macaravita","Matanza","Mogotes","Molagavita","Ocamonte","Oiba","Onzaga","Palmar","Palmas del Socorro","Páramo","Pinchote","Puerto Parra","Rionegro","San Andrés","San Benito","San Joaquín","San José de Miranda","San Miguel","Santa Bárbara","Santa Helena del Opón","Simacota","Suaita","Sucre","Suratá","Tona","Valle de San José","Vetas","Villanueva","Zapatoca"]},
    {"departamento":"Sucre","ciudades":["Sincelejo","Corozal","San Marcos","San Onofre","Tolú","Ovejas","Sampués","Chalán","Colosó","Coveñas","El Roble","Galeras","Guaranda","La Unión","Los Palmitos","Majagual","Morroa","San Antonio de Palmito","San Benito Abad","San Juan de Betulia","San Pedro","Sincé","Sucre","Tolú Viejo","Buenavista","Caimito"]},
    {"departamento":"Tolima","ciudades":["Ibagué","Espinal","Melgar","Líbano","Honda","Mariquita","Chaparral","Flandes","Rovira","Guamo","San Antonio","Cajamarca","Alvarado","Ambalema","Armero","Ataco","Casabianca","Coello","Coyaima","Cunday","Dolores","Falán","Fresno","Herveo","Icononzo","Lérida","Murillo","Natagaima","Ortega","Palocabildo","Piedras","Planadas","Prado","Purificación","Rioblanco","Roncesvalles","Saldaña","San Luis","Santa Isabel","Suárez","Valle de San Juan","Venadillo","Villahermosa","Villarrica","Alpujarra","Anzoátegui","Carmen de Apicalá"]},
    {"departamento":"Valle del Cauca","ciudades":["Cali","Buenaventura","Palmira","Tuluá","Buga","Cartago","Jamundí","Yumbo","Sevilla","Zarzal","Roldanillo","Caicedonia","Florida","Dagua","Ginebra","La Unión","Candelaria","El Cerrito","La Cumbre","Pradera","Andalucía","Ansermanuevo","Argelia","Bolívar","Bugalagrande","Calima","El Águila","El Cairo","El Dovio","Guacarí","La Victoria","Obando","Restrepo","Riofrío","San Pedro","Toro","Trujillo","Ulloa","Versalles","Vijes","Yotoco","Alcalá"]},
    {"departamento":"Vaupés","ciudades":["Mitú","Carurú","Taraira"]},
    {"departamento":"Vichada","ciudades":["Puerto Carreño","Cumaribo","La Primavera","Santa Rosalía"]}
  ];
  ciudadesPorDepto: string[] = [];

  constructor(private api: Api, private route: ActivatedRoute, private router: Router) {}

  // Al iniciar, si hay un ID en la ruta, carga los datos existentes para edición.
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.loading = true;
      this.api.get<any>(`/machinery/${id}`).subscribe({
        next: (res) => { const { imagenes, ...rest } = res.data; this.data = rest; this.loading = false; },
        error: () => { this.error = 'No se pudo cargar la maquinaria.'; this.loading = false; }
      });
    }
  }

  // Actualiza las coordenadas de ubicación desde el componente de mapa.
  onDepartamentoChange(): void {
    this.data.ciudad = '';
    const depto = this.colombiaData.find(d => d.departamento === this.data.departamento);
    this.ciudadesPorDepto = depto ? depto.ciudades : [];
  }

  onLocationChange(loc: { lat: number; lng: number }): void {
    this.data.ubicacion_lat = loc.lat;
    this.data.ubicacion_lng = loc.lng;
  }

  onPhotoDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    this.addPhotoFiles(event.dataTransfer?.files);
  }

  onPhotoDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onPhotoDragLeave(): void { this.isDragging = false; }

  onPhotoInput(event: Event): void {
    this.addPhotoFiles((event.target as HTMLInputElement).files);
    (event.target as HTMLInputElement).value = '';
  }

  removePhoto(index: number): void {
    this.photos.splice(index, 1);
  }

  private addPhotoFiles(files: FileList | null | undefined): void {
    if (!files) return;
    this.error = '';
    Array.from(files).filter(file => file.type.startsWith('image/')).forEach(file => {
      if (file.size > 900 * 1024) {
        this.error = 'Cada foto debe pesar máximo 900 KB en este modo demo.';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') this.photos.push({ file, preview: reader.result });
      };
      reader.readAsDataURL(file);
    });
  }

  // Envía el formulario: crea o actualiza según el modo, y redirige al detalle.
  onSubmit(): void {
    if (!this.isEdit && this.photos.length < 4) {
      this.error = 'Debes subir mínimo 4 fotos del vehículo o maquinaria.';
      return;
    }
    this.loading = true;
    const obs = this.isEdit
      ? this.api.put(`/machinery/${this.route.snapshot.paramMap.get('id')}`, this.data)
      : this.api.post('/machinery', this.data);
    obs.subscribe({
      next: (res: any) => this.uploadPhotosAndNavigate(res.data.id),
      error: () => { this.error = 'No se pudo guardar la maquinaria.'; this.loading = false; }
    });
  }

  private uploadPhotosAndNavigate(machineId: string): void {
    if (this.photos.length === 0) {
      this.router.navigate(['/machinery', machineId]);
      return;
    }
    const uploadRequests = this.photos.map(photo => 
      this.api.post(`/machinery/${machineId}/images`, { url: photo.preview }).pipe(
        catchError(() => of(null))
      )
    );
    forkJoin(uploadRequests).subscribe({
      next: () => this.router.navigate(['/machinery', machineId]),
      error: () => { 
        this.error = 'La maquinaria se guardó, pero no se pudieron subir todas las fotos.'; 
        this.loading = false; 
      }
    });
  }
}

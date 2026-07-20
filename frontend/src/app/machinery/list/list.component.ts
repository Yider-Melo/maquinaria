import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Api } from '../../core/services/api.service';
import { Auth } from '../../core/services/auth.service';
import { departamentos as deptos } from '../../shared/colombia-data';

@Component({
  standalone: false,
  selector: 'app-machinery-list', templateUrl: './list.html', styleUrls: ['./list.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MachineryList implements OnInit, OnDestroy {
  items: any[] = []; loading = true; total = 0; totalPages = 0; page = 1; size = 20; error = '';
  suggestions: string[] = [];
  sugerenciasCorreccion: string[] = [];
  buscandoUbicacion = false;
  ubicacionActiva = false;
  filters: any = { q: '', tipo: '', ciudad: '', departamento: '', minPrice: null, maxPrice: null, sort: 'price_asc' };
  private suggestionSubject = new Subject<string>();
  private suggestionSub: any;
  machineryTypes = ['Excavadora', 'Retroexcavadora', 'Bulldozer', 'Grúa', 'Montacargas', 'Volqueta', 'Compactadora', 'Motoniveladora'];
  departamentos = deptos;
  sortOptions = [
    { value: 'price_asc', label: 'Menor precio' },
    { value: 'price_desc', label: 'Mayor precio' },
    { value: 'rating', label: 'Mejor calificación' },
    { value: 'distance', label: 'Más cercanos' }
  ];
  ciudadesPorDepto: string[] = [];

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
    {"departamento":"Valle del Cauca","ciudades":["Cali","Buenaventura","Palmira","Tuluá","Buga","Cartago","Jamundí","Yumbo","Santander de Quilichao","Sevilla","Zarzal","Roldanillo","Caicedonia","Florida","Dagua","Ginebra","La Unión","Candelaria","El Cerrito","La Cumbre","Pradera","Andalucía","Ansermanuevo","Argelia","Bolívar","Bugalagrande","Calima","El Águila","El Cairo","El Dovio","Guacarí","La Victoria","Obando","Restrepo","Riofrío","San Pedro","Toro","Trujillo","Ulloa","Versalles","Vijes","Yotoco","Alcalá"]},
    {"departamento":"Vaupés","ciudades":["Mitú","Carurú","Taraira"]},
    {"departamento":"Vichada","ciudades":["Puerto Carreño","Cumaribo","La Primavera","Santa Rosalía"]}
  ];

  constructor(private api: Api, public auth: Auth, private cdr: ChangeDetectorRef, private snackBar: MatSnackBar, private router: Router) {}

  onCardEnter(event: Event): void {
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    target?.click();
  }

  trackById(_index: number, item: any): string { return item?.id || _index; }

  ngOnInit(): void {
    this.load();
    this.suggestionSub = this.suggestionSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(q => {
      if (q.length >= 2) this.loadSuggestions(q);
      else this.suggestions = [];
    });
  }

  ngOnDestroy(): void {
    this.suggestionSub?.unsubscribe();
  }

  onDepartamentoChange(): void {
    this.filters.ciudad = '';
    const depto = this.colombiaData.find(d => d.departamento === this.filters.departamento);
    this.ciudadesPorDepto = depto ? depto.ciudades : [];
    this.search();
  }

  load(): void {
    this.loading = true; this.error = '';
    this.sugerenciasCorreccion = [];
    const params: any = { ...this.cleanFilters(), page: this.page, size: this.size };
    if (this.auth.esTipo('propietario') && this.auth.getUser()?.id) {
      params.propietario_id = this.auth.getUser()!.id;
    }
    this.api.get<any>('/search', params).subscribe({
      next: (res) => {
        this.items = res.data?.data || [];
        this.total = res.data?.pagination?.total || 0;
        this.totalPages = res.data?.pagination?.totalPages || 0;
        this.loading = false;
        if (this.items.length === 0 && this.filters.q?.trim()) {
          this.buscarSugerencias(this.filters.q.trim());
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'No se pudo cargar la maquinaria. Intenta ajustar los filtros o revisar el backend.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  buscarSugerencias(q: string): void {
    this.api.get<string[]>('/search/suggestions', { q }).subscribe({
      next: (res) => {
        this.sugerenciasCorreccion = (res.data || []).filter(s => s.toLowerCase() !== q.toLowerCase()).slice(0, 5);
        this.cdr.markForCheck();
      }
    });
  }

  buscarSugerenciaClick(sugerencia: string): void {
    this.filters.q = sugerencia;
    this.search();
  }

  search(): void {
    if (this.filters.minPrice !== null && this.filters.maxPrice !== null && this.filters.maxPrice < this.filters.minPrice) {
      this.snackBar.open('El precio máximo no puede ser menor al mínimo.', 'Cerrar', { duration: 3000 });
      return;
    }
    this.page = 1;
    this.load();
  }
  buscarCerca(): void {
    if (!navigator.geolocation) {
      this.snackBar.open('La geolocalización no está disponible en este navegador.', 'Cerrar', { duration: 4000 });
      return;
    }
    this.buscandoUbicacion = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.filters.lat = pos.coords.latitude;
        this.filters.lng = pos.coords.longitude;
        this.filters.radius = 50;
        this.filters.sort = 'distance';
        this.ubicacionActiva = true;
        this.buscandoUbicacion = false;
        this.snackBar.open('📍 Mostrando maquinaria cerca de tu ubicación (radio 50km)', 'Cerrar', { duration: 4000 });
        this.search();
      },
      () => {
        this.buscandoUbicacion = false;
        this.snackBar.open('No se pudo obtener la ubicación. Verifica los permisos del navegador.', 'Cerrar', { duration: 4000 });
        this.cdr.markForCheck();
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }

  clearFilters(): void {
    this.filters = { q: '', tipo: '', ciudad: '', departamento: '', minPrice: null, maxPrice: null, sort: 'price_asc' };
    this.ciudadesPorDepto = [];
    this.ubicacionActiva = false;
    this.search();
    this.snackBar.open('Filtros limpiados', 'Cerrar', { duration: 2000 });
  }
  onQueryChange(): void {
    this.suggestionSubject.next(this.filters.q?.trim() || '');
  }

  private loadSuggestions(q: string): void {
    this.api.get<string[]>('/search/suggestions', { q }).subscribe({ 
      next: (res) => {
        this.suggestions = res.data || [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.suggestions = [];
        this.cdr.markForCheck();
      }
    });
  }
  prevPage(): void { if (this.page > 1) { this.page--; this.load(); } }
  nextPage(): void { if (this.page * this.size < this.total) { this.page++; this.load(); } }

  private cleanFilters(): Record<string, any> {
    return Object.fromEntries(Object.entries(this.filters).filter(([, value]) => value !== '' && value !== null && value !== undefined));
  }
}

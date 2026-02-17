'use client'
import { APIProvider, Map, AdvancedMarker, InfoWindow, Pin } from '@vis.gl/react-google-maps'
import { Col, Row } from 'react-bootstrap'

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''


const BasicMap = () => {
  return (
    <div id="basic_google_map" className="mb-4">
      <h5>Basic Example</h5>
      <APIProvider apiKey={API_KEY}>
        <Map
          defaultCenter={{ lat: 21.569874, lng: 71.5893798 }}
          defaultZoom={14}
          style={{ width: '100%', height: '350px' }}
        />
      </APIProvider>
    </div>
  )
}


const MapWithMarkers = () => {
  return (
    <div id="google_map" className="mb-4">
      <h5>Markers Google Map</h5>

      <APIProvider apiKey={API_KEY}>
        <Map
          defaultCenter={{ lat: 21.569874, lng: 71.5893798 }}
          defaultZoom={17}
          mapId="bf51a910020fa25b"
          style={{ width: '100%', height: '350px' }}
        >
          <AdvancedMarker position={{ lat: 21.569874, lng: 71.5893798 }}>
            <Pin />
          </AdvancedMarker>

          <AdvancedMarker position={{ lat: 21.56969, lng: 71.5893798 }}>
            <Pin background={"#1dbe80"} borderColor="#0e6443" />
          </AdvancedMarker>

          <InfoWindow position={{ lat: 21.56969, lng: 71.5893798 }}>
            <p>Marker with InfoWindow</p>
          </InfoWindow>
        </Map>
      </APIProvider>
    </div>
  )
}

const PolyLineMap = () => {
  const path = [
    { lat: 37.789411, lng: -122.422116 },
    { lat: 37.785757, lng: -122.421333 },
    { lat: 37.789352, lng: -122.415346 }
  ]

  return (
    <div id="poly_line" className="mb-4">
      <h5>PolyLine Google Map</h5>

      <APIProvider apiKey={API_KEY}>
        <Map
          defaultCenter={{ lat: 37.788, lng: -122.42 }}
          defaultZoom={14}
          style={{ width: '100%', height: '350px' }}
          mapId="polyline-map"
        />

        <svg style={{ display: 'none' }}>
          <polyline id="polyLinePath" points={path.map(p => `${p.lng},${p.lat}`).join(' ')} />
        </svg>
      </APIProvider>
    </div>
  )
}

const StreetViewMap = () => {
  return (
    <div id="street_view" className="mb-4">
      <h5>Street View Panoramas Google Map</h5>

      <APIProvider apiKey={API_KEY}>
        <Map
          defaultCenter={{ lat: 40.7295174, lng: -73.9986496 }}
          defaultZoom={14}
          mapTypeId="streetview"
          style={{ width: '100%', height: '350px' }}
        />
      </APIProvider>
    </div>
  )
}

const LightStyledMap = () => {
  return (
    <div id="ultra_light" className="mb-4">
      <h5>Ultra Light Styled Map</h5>

      <APIProvider apiKey={API_KEY}>
        <Map
          defaultCenter={{ lat: -12.043333, lng: -77.028333 }}
          defaultZoom={14}
          mapId="49ae42fed52588c3"
          style={{ width: '100%', height: '350px' }}
        />
      </APIProvider>
    </div>
  )
}

const DarkStyledMap = () => {
  return (
    <div id="dark_view" className="mb-4">
      <h5>Dark Google Map</h5>

      <APIProvider apiKey={API_KEY}>
        <Map
          defaultCenter={{ lat: -12.043333, lng: -77.028333 }}
          defaultZoom={14}
          mapId="dark-map-id"
          style={{ width: '100%', height: '350px' }}
        />
      </APIProvider>
    </div>
  )
}

const AllGoogleMaps = () => {
  return (
    <Row>
      <Col xl={9}>
        <BasicMap />
        <MapWithMarkers />
        <StreetViewMap />
        <PolyLineMap />
        <LightStyledMap />
        <DarkStyledMap />
      </Col>

      <Col xl={3}>
        <ul className="list-unstyled">
          <li><a href="#basic_google_map">Basic</a></li>
          <li><a href="#google_map">Markers Google Map</a></li>
          <li><a href="#street_view">Street View</a></li>
          <li><a href="#poly_line">PolyLine</a></li>
          <li><a href="#ultra_light">Ultra Light</a></li>
          <li><a href="#dark_view">Dark</a></li>
        </ul>
      </Col>
    </Row>
  )
}

export default AllGoogleMaps

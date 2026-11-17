#!/usr/bin/env python3
"""Generate FlightGlobe's bundled sample datasets (airports, flights, quakes,
satellites, land outlines). All coordinates are realistic public knowledge
(airport locations, famous quake zones); flight times are invented sample
schedules for 18 Nov 2026. Run: python3 scripts/generate-data.py
"""
import json, math, random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
DATA.mkdir(exist_ok=True)
random.seed(20261118)

# [lat, lon] polygons, simplified world coastline (recognisable, not survey-grade).
LAND = {
    "north_america": [
        [66, -168], [60, -165], [58, -158], [60, -152], [60, -145], [60, -140],
        [58, -135], [54, -130], [49, -125], [42, -124], [34, -120], [29, -114],
        [24, -110], [20, -105], [16, -97], [17, -94], [14, -90], [12, -86],
        [9, -83], [9, -79], [13, -81], [16, -84], [21, -87], [21, -90],
        [19, -91], [19, -96], [22, -97], [26, -97], [30, -93], [30, -89],
        [30, -84], [26, -81], [32, -80], [35, -76], [40, -74], [42, -70],
        [45, -68], [44, -65], [47, -60], [47, -55], [50, -53], [52, -55],
        [55, -60], [58, -65], [58, -68], [62, -72], [62, -78], [66, -85],
        [66, -92], [69, -95], [68, -110], [70, -125], [69, -135], [70, -145],
        [71, -155], [70, -162],
    ],
    "south_america": [
        [9, -79], [11, -74], [12, -72], [10, -64], [9, -60], [6, -52],
        [2, -50], [0, -50], [-3, -40], [-8, -35], [-15, -39], [-22, -40],
        [-28, -49], [-35, -55], [-39, -62], [-43, -65], [-47, -66],
        [-52, -68], [-55, -66], [-54, -71], [-50, -74], [-44, -74],
        [-40, -74], [-34, -72], [-28, -71], [-22, -70], [-18, -70],
        [-12, -77], [-6, -81], [-3, -81], [0, -80], [4, -77],
    ],
    "africa": [
        [35, -6], [35, 10], [33, 11], [30, 20], [31, 30], [31, 34],
        [27, 34], [22, 37], [18, 38], [12, 43], [11, 51], [5, 48],
        [0, 42], [-5, 40], [-10, 40], [-15, 40], [-20, 35], [-25, 33],
        [-29, 31], [-34, 26], [-34, 20], [-32, 18], [-28, 16], [-20, 12],
        [-12, 13], [-6, 12], [-2, 9], [4, 9], [6, 4], [6, -3],
        [5, -7], [10, -15], [12, -17], [16, -16], [20, -17], [27, -13],
        [31, -9], [35, -6],
    ],
    "europe": [
        [36, -9], [37, -9], [39, -9], [43, -9], [44, -2], [46, -2],
        [48, -4], [50, -1], [51, 1], [53, 3], [55, 8], [57, 8],
        [58, 5], [60, 5], [62, 6], [65, 12], [68, 15], [70, 20],
        [70, 30], [68, 33], [66, 40], [64, 40], [60, 38], [60, 30],
        [58, 28], [56, 21], [54, 19], [55, 13], [54, 11], [52, 5],
        [50, 8], [47, 8], [44, 8], [42, 10], [40, 9], [38, 16],
        [40, 16], [38, 22], [36, 23], [40, 23], [41, 19], [43, 16],
        [45, 13], [45, 12], [44, 8], [43, 3], [42, 3], [39, 0],
        [38, -1], [36, -6],
    ],
    "asia": [
        [66, 40], [68, 50], [70, 55], [70, 65], [72, 75], [73, 85],
        [76, 100], [76, 110], [72, 120], [72, 130], [70, 140], [70, 150],
        [68, 160], [66, 170], [64, 178], [60, 170], [60, 162], [56, 162],
        [52, 158], [50, 155], [46, 150], [44, 142], [42, 135], [40, 128],
        [38, 122], [34, 120], [30, 122], [26, 120], [22, 114], [20, 110],
        [18, 108], [14, 109], [10, 107], [8, 104], [6, 100], [4, 98],
        [6, 95], [10, 92], [15, 92], [20, 92], [22, 90], [22, 86],
        [20, 80], [16, 80], [10, 77], [8, 76], [12, 75], [18, 73],
        [22, 70], [24, 66], [25, 62], [26, 57], [28, 51], [30, 48],
        [30, 50], [33, 52], [36, 54], [38, 56], [40, 52], [42, 50],
        [44, 48], [46, 44], [48, 42], [50, 40], [54, 38], [58, 36],
        [60, 36], [62, 38], [64, 40],
    ],
    "australia": [
        [-12, 132], [-11, 136], [-14, 141], [-17, 146], [-20, 148],
        [-25, 153], [-28, 153], [-32, 152], [-35, 150], [-38, 147],
        [-39, 146], [-38, 144], [-35, 139], [-33, 136], [-32, 132],
        [-31, 130], [-33, 126], [-35, 120], [-34, 115], [-32, 115],
        [-28, 114], [-25, 113], [-22, 114], [-18, 121], [-15, 124],
        [-14, 127], [-12, 132],
    ],
    "greenland": [
        [60, -43], [62, -48], [64, -52], [68, -53], [70, -54], [72, -56],
        [74, -58], [76, -60], [78, -68], [80, -66], [82, -60], [82, -50],
        [80, -42], [78, -36], [76, -30], [74, -25], [72, -22], [70, -22],
        [68, -26], [66, -32], [64, -36], [62, -40],
    ],
    "antarctica": [
        [-66, -60], [-68, -40], [-70, -20], [-70, 0], [-68, 20], [-66, 40],
        [-66, 60], [-67, 80], [-66, 100], [-66, 120], [-66, 140],
        [-68, 160], [-72, 170], [-75, 165], [-78, 160], [-80, 150],
        [-82, 120], [-84, 90], [-84, 60], [-82, 30], [-78, 0],
        [-74, -30], [-70, -50], [-66, -60],
    ],
    "japan": [[31, 130], [33, 132], [35, 137], [37, 140], [39, 141],
              [41, 141], [43, 144], [44, 142], [42, 140], [38, 139],
              [35, 136], [33, 133], [31, 130]],
    "united_kingdom": [[50, -4], [51, -2], [53, -3], [55, -2], [57, -2],
                        [58, -4], [57, -6], [55, -6], [53, -5], [51, -4], [50, -4]],
    "madagascar": [[-12, 49], [-16, 50], [-20, 48], [-24, 47], [-25, 45],
                    [-22, 43], [-18, 44], [-14, 48], [-12, 49]],
    "new_zealand": [[-35, 174], [-38, 176], [-40, 176], [-42, 173],
                     [-44, 171], [-46, 168], [-44, 168], [-41, 174],
                     [-38, 174], [-36, 174], [-35, 174]],
    "indonesia": [[6, 95], [5, 98], [2, 100], [-2, 101], [-4, 104],
                   [-6, 107], [-7, 110], [-7, 113], [-8, 115], [-9, 118],
                   [-10, 120], [-8, 118], [-5, 119], [-2, 121], [0, 120],
                   [2, 118], [4, 116], [5, 113], [4, 108], [2, 102], [6, 95]],
    "borneo": [[4, 117], [2, 110], [-2, 110], [-4, 113], [-3, 116], [1, 117], [4, 117]],
    "hawaii": [[19.6, -155.9], [20.9, -156.4], [21.4, -157.8], [22.2, -159.8],
               [21.9, -160.2], [20.7, -156.9], [19.6, -155.9]],
    "iceland": [[63.4, -22.0], [64.0, -22.5], [64.8, -23.9], [65.5, -24.5],
                [66.0, -22.8], [66.4, -18.8], [65.8, -16.5], [64.9, -14.0],
                [64.0, -15.5], [63.4, -19.5], [63.4, -22.0]],
    "ireland": [[51.7, -9.5], [52.0, -10.0], [53.0, -10.0], [54.0, -10.0],
                [55.0, -8.0], [55.3, -6.0], [54.5, -5.5], [53.5, -6.0],
                [52.5, -6.5], [51.7, -8.5], [51.7, -9.5]],
    "sri_lanka": [[9.8, 79.9], [9.3, 80.8], [8.6, 81.2], [7.9, 81.5],
                  [6.9, 81.9], [6.0, 81.0], [6.4, 79.9], [7.5, 79.8],
                  [8.9, 79.9], [9.8, 79.9]],
    "taiwan": [[25.3, 121.6], [25.0, 121.9], [24.0, 121.6], [23.0, 121.2],
               [22.6, 121.1], [22.6, 120.2], [23.5, 120.1], [24.5, 120.2], [25.3, 121.6]],
    "cuba": [[23.2, -81.2], [23.0, -79.5], [22.5, -78.5], [21.8, -77.5],
             [21.0, -76.5], [20.3, -75.0], [20.2, -74.1], [21.0, -75.5],
             [21.8, -77.0], [22.8, -79.0], [23.2, -81.2]],
}

AIRPORTS = [
    ("SIN", "Singapore Changi", "Singapore", 1.36, 103.99),
    ("LHR", "London Heathrow", "London", 51.47, -0.45),
    ("JFK", "John F. Kennedy Intl", "New York", 40.64, -73.78),
    ("DXB", "Dubai Intl", "Dubai", 25.25, 55.36),
    ("HND", "Tokyo Haneda", "Tokyo", 35.55, 139.78),
    ("SYD", "Sydney Kingsford Smith", "Sydney", -33.95, 151.18),
    ("CDG", "Paris Charles de Gaulle", "Paris", 49.01, 2.55),
    ("FRA", "Frankfurt am Main", "Frankfurt", 50.03, 8.56),
    ("ORD", "Chicago O'Hare", "Chicago", 41.97, -87.91),
    ("LAX", "Los Angeles Intl", "Los Angeles", 33.94, -118.41),
    ("BOM", "Chhatrapati Shivaji Intl", "Mumbai", 19.09, 72.87),
    ("DEL", "Indira Gandhi Intl", "New Delhi", 28.57, 77.10),
    ("ICN", "Incheon Intl", "Seoul", 37.46, 126.44),
    ("PEK", "Beijing Capital Intl", "Beijing", 40.08, 116.58),
    ("GRU", "São Paulo–Guarulhos", "São Paulo", -23.44, -46.47),
    ("JNB", "O.R. Tambo Intl", "Johannesburg", -26.14, 28.25),
    ("CAI", "Cairo Intl", "Cairo", 30.12, 31.41),
    ("YYZ", "Toronto Pearson", "Toronto", 43.68, -79.63),
    ("MEX", "Mexico City Intl", "Mexico City", 19.44, -99.07),
    ("AMS", "Amsterdam Schiphol", "Amsterdam", 52.31, 4.76),
    ("MAD", "Adolfo Suárez Madrid–Barajas", "Madrid", 40.50, -3.57),
    ("IST", "Istanbul Airport", "Istanbul", 41.28, 28.74),
    ("DOH", "Hamad Intl", "Doha", 25.27, 51.61),
    ("HKG", "Hong Kong Intl", "Hong Kong", 22.31, 113.91),
    ("SFO", "San Francisco Intl", "San Francisco", 37.62, -122.38),
    ("ATL", "Hartsfield–Jackson Atlanta", "Atlanta", 33.64, -84.43),
    ("EZE", "Ministro Pistarini Intl", "Buenos Aires", -34.82, -58.54),
    ("AKL", "Auckland Airport", "Auckland", -37.01, 174.79),
    ("NRT", "Narita Intl", "Tokyo", 35.77, 140.39),
    ("BKK", "Suvarnabhumi", "Bangkok", 13.69, 100.75),
    ("KUL", "Kuala Lumpur Intl", "Kuala Lumpur", 2.75, 101.71),
    ("MEL", "Melbourne Airport", "Melbourne", -37.67, 144.84),
    ("ZRH", "Zurich Airport", "Zurich", 47.46, 8.55),
    ("CPH", "Copenhagen Airport", "Copenhagen", 55.62, 12.66),
    ("VIE", "Vienna Intl", "Vienna", 48.11, 16.57),
    ("ATH", "Athens Intl", "Athens", 37.94, 23.94),
    ("NBO", "Jomo Kenyatta Intl", "Nairobi", -1.32, 36.93),
    ("LIS", "Lisbon Humberto Delgado", "Lisbon", 38.77, -9.13),
    ("YVR", "Vancouver Intl", "Vancouver", 49.20, -123.18),
    ("SCL", "Santiago Intl", "Santiago", -33.39, -70.79),
    ("DFW", "Dallas/Fort Worth Intl", "Dallas", 32.90, -97.04),
    ("DEN", "Denver Intl", "Denver", 39.86, -104.68),
    ("SEA", "Seattle–Tacoma Intl", "Seattle", 47.45, -122.31),
    ("MIA", "Miami Intl", "Miami", 25.79, -80.29),
    ("BOS", "Boston Logan Intl", "Boston", 42.36, -71.01),
    ("IAD", "Washington Dulles Intl", "Washington", 38.95, -77.46),
    ("HNL", "Honolulu Intl", "Honolulu", 21.32, -157.92),
    ("DUB", "Dublin Airport", "Dublin", 53.42, -6.27),
    ("WAW", "Warsaw Chopin", "Warsaw", 52.17, 20.97),
    ("HEL", "Helsinki Airport", "Helsinki", 60.32, 24.96),
]

def hhmm(mins):
    return f"{mins // 60:02d}:{mins % 60:02d}"

ROUTES = [
    ("SQ318", "SIN", "LHR", 650, 1435), ("SQ321", "LHR", "SIN", 80, 815),
    ("EK215", "DXB", "LAX", 495, 1300), ("EK202", "JFK", "DXB", 1330, 380),
    ("BA117", "LHR", "JFK", 540, 1020), ("BA178", "JFK", "LHR", 1130, 230),
    ("JL44", "HND", "LHR", 620, 1400), ("NH211", "HND", "LHR", 720, 60),
    ("QF1", "SYD", "SIN", 960, 1420), ("QF2", "SIN", "SYD", 100, 900),
    ("AF66", "CDG", "JFK", 620, 1100), ("AF7", "CDG", "JFK", 800, 1280),
    ("LH401", "FRA", "JFK", 600, 1080), ("LH441", "FRA", "IAH", 660, 1140),
    ("UA1", "SFO", "SIN", 660, 1380), ("UA28", "SIN", "SFO", 540, 1200),
    ("AI131", "LHR", "BOM", 560, 1160), ("AI101", "DEL", "JFK", 120, 900),
    ("KE82", "ICN", "JFK", 590, 1150), ("CA981", "PEK", "JFK", 720, 1320),
    ("LA801", "GRU", "LHR", 1080, 200), ("LA807", "GRU", "MAD", 1020, 120),
    ("SA201", "JNB", "LHR", 1080, 60), ("MS986", "CAI", "JFK", 60, 660),
    ("AC1", "YYZ", "HND", 780, 1380), ("AC856", "YYZ", "LHR", 1100, 200),
    ("AM1", "MEX", "CDG", 1100, 120), ("KL644", "AMS", "JFK", 600, 1020),
    ("IB601", "MAD", "EZE", 660, 1400), ("TK1", "IST", "JFK", 420, 960),
    ("QR701", "DOH", "JFK", 480, 1080), ("CX252", "HKG", "LHR", 700, 1440),
    ("DL1", "ATL", "LHR", 1080, 200), ("NZ1", "AKL", "LAX", 1080, 360),
    ("TG911", "BKK", "LHR", 720, 120), ("MH1", "KUL", "LHR", 1400, 300),
    ("QF9", "MEL", "LHR", 900, 300), ("LX8", "ZRH", "ORD", 780, 1260),
    ("SK901", "CPH", "ORD", 960, 1380), ("OS65", "VIE", "JFK", 600, 1080),
    ("A3", "ATH", "JFK", 900, 1380), ("KQ100", "NBO", "LHR", 1200, 200),
    ("TP201", "LIS", "JFK", 960, 1380), ("AC4", "YVR", "LHR", 1020, 100),
    ("LA800", "SCL", "GRU", 900, 1140), ("EK421", "DXB", "BOM", 600, 900),
    ("SQ26", "SIN", "FRA", 1400, 360), ("EK225", "DXB", "SFO", 540, 1260),
    ("BA269", "LHR", "LAX", 660, 1140), ("QF63", "SYD", "JNB", 660, 1200),
    ("AA100", "DFW", "LHR", 1020, 240), ("UA1200", "DEN", "FRA", 1080, 240),
    ("AS1", "SEA", "HND", 840, 1320), ("AA900", "MIA", "MAD", 1140, 120),
    ("BA212", "BOS", "LHR", 1140, 220), ("UA918", "IAD", "FRA", 1080, 180),
    ("HA1", "HNL", "HND", 720, 1200), ("EI101", "DUB", "JFK", 840, 1200),
    ("LO1", "WAW", "ORD", 720, 1140), ("AY101", "HEL", "JFK", 900, 1260),
    ("AA101", "LHR", "DFW", 600, 1080), ("UA901", "FRA", "DEN", 660, 1080),
    ("EK3", "DXB", "LHR", 840, 1260), ("SQ317", "LHR", "SIN", 660, 60),
    ("QF11", "SYD", "LAX", 840, 1560), ("NZ2", "LAX", "AKL", 1200, 300),
    ("LH714", "FRA", "HND", 780, 60), ("AF276", "CDG", "HND", 780, 120),
]
# IAH is not in the airport list; drop routes referencing unknown codes.
AIRPORT_CODES = {a[0] for a in AIRPORTS}

AIRCRAFT = ["Boeing 777-300ER", "Airbus A380-800", "Boeing 787-9", "Airbus A350-900",
            "Boeing 747-8", "Airbus A330-300", "Boeing 777-200LR"]
AIRLINES = {"SQ": "Singapore Airlines", "EK": "Emirates", "BA": "British Airways",
            "JL": "Japan Airlines", "NH": "ANA", "QF": "Qantas", "AF": "Air France",
            "LH": "Lufthansa", "UA": "United", "AI": "Air India", "KE": "Korean Air",
            "CA": "Air China", "LA": "LATAM", "SA": "South African Airways",
            "MS": "EgyptAir", "AC": "Air Canada", "AM": "Aeroméxico", "KL": "KLM",
            "IB": "Iberia", "TK": "Turkish Airlines", "QR": "Qatar Airways",
            "CX": "Cathay Pacific", "DL": "Delta", "NZ": "Air New Zealand",
            "TG": "Thai Airways", "MH": "Malaysia Airlines", "LX": "SWISS",
            "SK": "SAS", "OS": "Austrian", "A3": "Aegean", "KQ": "Kenya Airways",
            "TP": "TAP Air Portugal", "AA": "American Airlines", "AS": "Alaska Airlines",
            "HA": "Hawaiian Airlines", "EI": "Aer Lingus", "LO": "LOT Polish Airlines",
            "AY": "Finnair"}

def build():
    airports = [{"code": c, "name": n, "city": city, "lat": lat, "lon": lon}
                for c, n, city, lat, lon in AIRPORTS]
    flights = []
    for fid, frm, to, dep, arr in ROUTES:
        if frm not in AIRPORT_CODES or to not in AIRPORT_CODES:
            continue
        prefix = "".join(ch for ch in fid if ch.isalpha())
        flights.append({
            "id": fid, "from": frm, "to": to,
            "dep": hhmm(dep % 1440), "arr": hhmm(arr % 1440),
            "airline": AIRLINES.get(prefix, "—"),
            "aircraft": random.choice(AIRCRAFT),
        })
    quake_places = [
        (38.3, 142.4, "Off the coast of Honshu, Japan"), (37.8, -122.4, "San Francisco Bay Area, California"),
        (-3.3, 128.1, "Banda Sea, Indonesia"), (-20.3, -70.9, "Offshore Tarapacá, Chile"),
        (36.2, 33.4, "Eastern Mediterranean Sea"), (-6.1, 105.4, "Sunda Strait, Indonesia"),
        (60.9, -147.3, "Southern Alaska"), (-17.9, -178.5, "Fiji region"),
        (28.4, 84.7, "Gandaki, Nepal"), (39.1, 29.9, "Western Türkiye"),
        (-9.9, 160.0, "Solomon Islands"), (41.8, 44.8, "Georgia (Sakartvelo)"),
        (-0.8, -80.9, "Near the coast of Ecuador"), (52.5, 159.9, "Kamchatka, Russia"),
        (14.6, -92.4, "Offshore Chiapas, Mexico"), (35.7, 140.1, "Chiba, Japan"),
        (-31.6, -71.2, "Coquimbo, Chile"), (7.2, 126.6, "Mindanao, Philippines"),
        (23.8, 121.7, "Taiwan region"), (-5.6, 148.2, "Papua New Guinea"),
        (30.1, 101.9, "Sichuan, China"), (64.8, -21.1, "Iceland region"),
        (-42.9, 172.7, "Canterbury, New Zealand"), (18.9, -155.7, "Hawaii, USA"),
        (44.1, 7.9, "Ligurian Sea, Italy"), (34.5, -120.1, "California, USA"),
        (-15.9, -172.9, "Samoa region"), (56.5, -153.9, "Kodiak, Alaska"),
        (13.1, 43.4, "Gulf of Aden"), (29.5, 51.5, "Southern Iran"),
        (41.2, 73.8, "Kyrgyzstan"), (-6.9, 110.6, "Java, Indonesia"),
        (55.7, -3.2, "North Sea"), (19.4, -155.3, "Hawaii, USA"),
        (37.1, 36.8, "Southern Türkiye"), (-23.5, -46.6, "São Paulo, Brazil"),
        (31.5, 130.2, "Kyushu, Japan"), (-33.0, 71.6, "Valparaíso, Chile"),
        (43.0, 12.5, "Umbria, Italy"), (27.9, 85.3, "Bagmati, Nepal"),
    ]
    quakes = []
    for i, (lat, lon, place) in enumerate(quake_places):
        mag = round(random.uniform(2.6, 7.2), 1)
        quakes.append({"id": f"q{i+1:02d}", "lat": lat, "lon": lon, "mag": mag,
                       "place": place, "depthKm": random.randint(8, 120),
                       "time": f"2026-11-1{random.randint(7, 8)}T{random.randint(0,23):02d}:{random.randint(0,59):02d}:00Z"})
    sats = [
        {"name": "ISS", "inclination": 51.6, "periodMin": 92.9, "phase": 12, "altitudeKm": 420},
        {"name": "Starlink-3012", "inclination": 53.0, "periodMin": 95.3, "phase": 210, "altitudeKm": 550},
        {"name": "Starlink-4451", "inclination": 53.0, "periodMin": 95.3, "phase": 40, "altitudeKm": 550},
        {"name": "Starlink-7780", "inclination": 70.0, "periodMin": 97.1, "phase": 300, "altitudeKm": 560},
        {"name": "NOAA-20", "inclination": 98.7, "periodMin": 101.4, "phase": 95, "altitudeKm": 824},
        {"name": "Sentinel-2A", "inclination": 98.6, "periodMin": 100.6, "phase": 250, "altitudeKm": 786},
        {"name": "Landsat 9", "inclination": 98.2, "periodMin": 98.9, "phase": 170, "altitudeKm": 705},
        {"name": "Hubble", "inclination": 28.5, "periodMin": 95.4, "phase": 330, "altitudeKm": 535},
        {"name": "Tiangong", "inclination": 41.5, "periodMin": 92.6, "phase": 75, "altitudeKm": 390},
        {"name": "OneWeb-0442", "inclination": 87.9, "periodMin": 109.2, "phase": 140, "altitudeKm": 1200},
        {"name": "GPS III SV06", "inclination": 55.0, "periodMin": 718.0, "phase": 260, "altitudeKm": 20180},
        {"name": "GOES-16", "inclination": 0.1, "periodMin": 1436.0, "phase": 285, "altitudeKm": 35786},
        {"name": "Starlink-9021", "inclination": 53.0, "periodMin": 95.3, "phase": 130, "altitudeKm": 550},
        {"name": "Starlink-9107", "inclination": 53.0, "periodMin": 95.3, "phase": 285, "altitudeKm": 550},
        {"name": "Sentinel-1A", "inclination": 98.2, "periodMin": 98.6, "phase": 55, "altitudeKm": 693},
        {"name": "Terra", "inclination": 98.2, "periodMin": 98.9, "phase": 200, "altitudeKm": 705},
    ]
    land = {"source": "FlightGlobe simplified coastline (hand-drawn, recognisable outlines)",
            "polygons": [[list(p) for p in poly] for poly in LAND.values()]}
    # Per-continent files: data/land/<name>.json + a manifest, so the app loads
    # the coastline in parts and each continent is reviewable on its own.
    land_dir = DATA / "land"
    land_dir.mkdir(exist_ok=True)
    manifest = []
    for name, poly in LAND.items():
        (land_dir / f"{name}.json").write_text(
            json.dumps({"name": name, "polygons": [[list(p) for p in poly]]}, indent=2) + "\n")
        manifest.append(f"land/{name}.json")
    (land_dir / "manifest.json").write_text(
        json.dumps({"files": manifest}, indent=2) + "\n")
    (DATA / "airports.json").write_text(json.dumps(airports, indent=2) + "\n")
    (DATA / "flights.json").write_text(json.dumps(flights, indent=2) + "\n")
    (DATA / "earthquakes.json").write_text(json.dumps(quakes, indent=2) + "\n")
    (DATA / "satellites.json").write_text(json.dumps(sats, indent=2) + "\n")
    print(f"airports={len(airports)} flights={len(flights)} quakes={len(quakes)} "
          f"sats={len(sats)} land_polygons={len(land['polygons'])}")

if __name__ == "__main__":
    build()
